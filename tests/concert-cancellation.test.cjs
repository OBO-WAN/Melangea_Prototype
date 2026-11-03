const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Exercise the real renderer through its DOMContentLoaded and refresh handlers.
// This small DOM fixture deliberately treats textContent as text, not markup.
class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = '';
    this.dataset = {};
    this.attributes = {};
  }
  set textContent(text) { this.text = String(text); this.children = []; }
  get textContent() { return this.children.length ? this.children.map(child => child.textContent).join('') : this.text || ''; }
  get childElementCount() { return this.children.length; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
}

const descendants = node => [node, ...node.children.flatMap(descendants)];
const hasClass = (node, name) => node.className.split(' ').includes(name);
const withClass = (node, name) => descendants(node).filter(child => hasClass(child, name));
const links = node => descendants(node).filter(child => child.tagName === 'a');
const future = (extra = {}) => ({date: '04.11.2026', title: 'Konzert', city: 'Neustadt', venue: 'Park', time: '20:00 Uhr', detailsUrl: '/details', ticketsUrl: '/tickets', hideAfter: '03:00', ...extra});

async function renderer(initialEvents, now = '2026-11-03T12:00:00Z') {
  const compact = new Element('ul');
  const cards = new Element('div');
  const listeners = {};
  const timers = {};
  let clock = Date.parse(now);
  let currentEvents = initialEvents;
  let failing = false;
  const requests = [];
  const document = {
    hidden: false,
    createElement: tag => new Element(tag),
    querySelectorAll: selector => selector.includes('compact') ? [compact] : [cards],
    addEventListener: (name, listener) => { listeners[name] = listener; },
  };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  }
  const context = vm.createContext({
    document, window: {}, Intl, Date: ClockDate,
    console: {error() {}},
    setTimeout: callback => { timers.timeout = callback; },
    setInterval: callback => { timers.interval = callback; },
    fetch: async (url, options) => {
      requests.push({url, options});
      if (failing) throw new Error('Temporary network failure');
      return {ok: true, json: async () => currentEvents};
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../JS/concert-render.js'), 'utf8'), context);
  await listeners.DOMContentLoaded();
  return {
    compact, cards, document, timers, requests,
    setEvents: events => { currentEvents = events; },
    fail: value => { failing = value; },
    setClock: value => { clock = Date.parse(value); },
    refresh: () => listeners.visibilitychange(),
  };
}

test('both listings keep cancellations visible, explain them, and remove only ticket links', async () => {
  const reason = 'Wegen Unwetter abgesagt. <img src=x onerror=alert(1)>';
  const page = await renderer([
    future(),
    future({cancelled: true, cancellationReason: reason}),
    future({status: 'cancelled'}),
    future({cancelled: 'false'}),
    future({status: 'past'}),
    future({date: '02.11.2026', cancelled: true}),
  ]);
  for (const listing of [page.compact, page.cards]) {
    assert.equal(listing.children.length, 4);
    const [normal, cancelled, legacy, falseString] = listing.children;
    assert.equal(withClass(normal, 'concert-cancellation').length, 0);
    assert(links(normal).some(link => link.textContent === 'Tickets'));
    assert.equal(withClass(cancelled, 'concert-cancellation__label')[0].textContent, 'ABGESAGT');
    const message = withClass(cancelled, 'concert-cancellation__reason')[0];
    assert.equal(message.textContent, reason);
    assert.equal(message.children.length, 0);
    assert.deepEqual(links(cancelled).map(link => link.textContent), ['Details']);
    assert.equal(withClass(legacy, 'concert-cancellation__label').length, 1);
    assert.equal(withClass(legacy, 'concert-cancellation__reason').length, 0);
    assert(links(falseString).some(link => link.textContent === 'Tickets'));
  }
  assert.equal(page.requests[0].options.cache, 'no-store');
});

test('cancellation and reinstatement reach open pages at the minute refresh', async () => {
  const page = await renderer([future()]);
  page.setEvents([future({cancelled: true, cancellationReason: 'Wegen Unwetter abgesagt.'})]);
  page.timers.timeout();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(withClass(page.cards, 'concert-cancellation__label').length, 1);
  page.setEvents([future({cancelled: false, cancellationReason: 'Old reason'})]);
  await page.timers.interval();
  for (const listing of [page.compact, page.cards]) {
    assert.equal(withClass(listing, 'concert-cancellation').length, 0);
    assert(links(listing).some(link => link.textContent === 'Tickets'));
  }
});

test('a failed refresh keeps the cancellation, while a successful empty response removes it', async () => {
  const page = await renderer([future({cancelled: true})]);
  page.fail(true);
  await page.refresh();
  assert.equal(withClass(page.cards, 'concert-cancellation__label').length, 1);
  page.fail(false);
  page.setEvents([]);
  await page.refresh();
  assert.equal(withClass(page.cards, 'concert-cancellation__label').length, 0);
  assert.match(page.cards.textContent, /keine Konzerttermine/);
});

test('cancellation follows the same Berlin cutoff even when offline or hidden', async () => {
  const page = await renderer([future({date: '03.11.2026', cancelled: true})], '2026-11-04T01:59:00Z');
  assert.equal(withClass(page.cards, 'concert-cancellation__label').length, 1);
  page.document.hidden = true;
  page.setClock('2026-11-04T02:00:00Z'); // 03:00 Europe/Berlin.
  await page.refresh();
  assert.equal(withClass(page.cards, 'concert-cancellation__label').length, 0);
  assert.equal(page.requests.length, 1);
});
