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
  focus() { this.focused = true; }
  scrollIntoView() { this.scrolled = true; }
}

const descendants = node => [node, ...node.children.flatMap(descendants)];
const hasClass = (node, name) => node.className.split(' ').includes(name);
const withClass = (node, name) => descendants(node).filter(child => hasClass(child, name));
const links = node => descendants(node).filter(child => child.tagName === 'a');
const future = (extra = {}) => ({date: '04.11.2026', title: 'Konzert', city: 'Neustadt', venue: 'Park', time: '20:00 Uhr', detailsUrl: '/details', ticketsUrl: '/tickets', hideAfter: '03:00', ...extra});
const demoFeed = './demo/public-concerts.json';
const pagesHome = 'https://obo-wan.github.io/Melangea_Prototype/';

async function renderer(initialEvents, now = '2026-11-03T12:00:00Z', hash = '', site = 'https://melangea2.com/') {
  const compact = new Element('ul');
  const cards = new Element('div');
  const listeners = {};
  const timers = {};
  let clock = Date.parse(now);
  let currentEvents = initialEvents;
  let failing = false;
  const location = new URL(site);
  if (hash) location.hash = hash;
  const requests = [];
  const document = {
    hidden: false,
    createElement: tag => new Element(tag),
    querySelectorAll: selector => selector.includes('compact') ? [compact] : [cards],
    getElementById: id => descendants(cards).find(node => node.id === id),
    addEventListener: (name, listener) => { listeners[name] = listener; },
  };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  }
  const context = vm.createContext({
    document, window: {location}, Intl, Date: ClockDate,
    console: {error() {}},
    setTimeout: callback => { timers.timeout = callback; },
    setInterval: callback => { timers.interval = callback; },
    fetch: async (url, options) => {
      requests.push({url, options});
      if (failing) throw new Error('Temporary network failure');
      if (url === demoFeed) {
        return {ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', demoFeed), 'utf8'))};
      }
      assert.equal(url, './data/concerts.json');
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
    const actionClass = listing === page.compact ? 'event-actions' : 'concerts-card__actions';
    assert.deepEqual(links(withClass(cancelled, actionClass)[0]).map(link => link.textContent), ['Details']);
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

test('each homepage row links to its own description, including two shows in the same slot', async () => {
  const shows = [
    future({title: 'Chansons & Café', description: 'Erste Vorstellung'}),
    future({title: 'Chansons & Café', description: 'Zweite Vorstellung', cancelled: true}),
  ];
  const {compact, cards} = await renderer(shows);
  const headings = withClass(cards, 'concerts-card__title');
  assert.notEqual(headings[0].id, headings[1].id);
  for (const [i, row] of compact.children.entries()) {
    const link = withClass(row, 'event-link')[0];
    assert.equal(link.tagName, 'a');
    assert.equal(link.href, './konzerte.html#' + headings[i].id);
    assert.equal(withClass(cards.children[i], 'concerts-card__description')[0].textContent, shows[i].description);
    const actions = links(withClass(row, 'event-actions')[0]);
    assert.deepEqual(actions.map(action => action.href), i === 0 ? ['/details', '/tickets'] : ['/details']);
  }

  const hash = '#' + headings[1].id;
  const destination = await renderer([], undefined, hash);
  destination.setEvents(shows);
  await destination.refresh();
  const [first, second] = withClass(destination.cards, 'concerts-card__title');
  assert.equal(first.scrolled, undefined);
  assert.equal(second.scrolled, true);
  assert.equal(second.focused, true);

  destination.setEvents([...shows, future({date: '05.11.2026'})]);
  await destination.refresh();
  assert.equal(withClass(destination.cards, 'concerts-card__title')[1].scrolled, undefined);
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

test('the Pages homepage and shared description links agree as the demo dates roll over', async () => {
  const page = await renderer([future({date: '31.12.2026'})], '2026-12-27T23:30:00Z', '', pagesHome);
  assert.deepEqual(page.requests.map(req => req.url), [demoFeed]);
  assert.deepEqual(withClass(page.cards, 'concerts-card__date').map(el => el.textContent),
    ['04.01.2027', '04.01.2027', '11.01.2027']);
  assert.equal(page.compact.children.length, 3);
  assert.deepEqual(withClass(page.compact, 'event-link').map(el => el.textContent),
    ['Demo – Chansons im Salon', 'Demo – Jazz im Hof', 'Demo – Matinee im Foyer']);
  const cancelled = page.compact.children[2];
  assert.equal(withClass(cancelled, 'concert-cancellation__label')[0].textContent, 'ABGESAGT');
  assert.deepEqual(links(withClass(cancelled, 'event-actions')[0]).map(el => el.textContent), ['Details']);

  const jazz = page.compact.children[1];
  const destination = new URL(withClass(jazz, 'event-link')[0].href, pagesHome);
  assert.equal(destination.href, pagesHome + 'konzerte.html#konzert-demo-jazz-im-hof');
  const nextDay = await renderer([], '2026-12-28T23:30:00Z', '', destination);
  const card = nextDay.cards.children[1];
  assert.equal(withClass(card, 'concerts-card__date')[0].textContent, '05.01.2027');
  const heading = withClass(card, 'concerts-card__title')[0];
  assert.equal(heading.id, destination.hash.slice(1));
  assert.equal(heading.focused, true);
  assert.equal(heading.scrolled, true);
  assert.match(withClass(card, 'concerts-card__description')[0].textContent, /Musette-Walzer/);

  const preview = fs.readFileSync(path.join(__dirname, '../demo/konzertprobe.html'), 'utf8');
  const actions = links(withClass(jazz, 'event-actions')[0]);
  assert.deepEqual(actions.map(el => new URL(el.href, pagesHome).href), [
    pagesHome + 'demo/konzertprobe.html?konzert=jazz-im-hof#details',
    pagesHome + 'demo/konzertprobe.html?konzert=jazz-im-hof#tickets',
  ]);
  for (const action of actions) {
    assert.ok(preview.includes('id="' + new URL(action.href, pagesHome).hash.slice(1) + '"'));
  }
});

test('localhost fills an empty listing, follows real listings on refresh, and can open shared demo links', async () => {
  const local = 'http://localhost:5500/';
  const page = await renderer([future({status: 'past'})], undefined, '', local);
  assert.deepEqual(page.requests.map(req => req.url), ['./data/concerts.json', demoFeed]);
  assert.equal(page.compact.children.length, 3);
  page.setEvents([future({title: 'Lokal eingetragen'})]);
  await page.refresh();
  assert.equal(page.compact.children.length, 1);
  assert.equal(withClass(page.compact, 'event-link')[0].textContent, 'Lokal eingetragen');
  const link = local + 'konzerte.html#konzert-demo-jazz-im-hof';
  const destination = await renderer([future()], undefined, '', link);
  assert.equal(destination.document.getElementById('konzert-demo-jazz-im-hof').focused, true);
});

test('production and other Pages projects always use their real concert feed, including for a demo hash', async () => {
  for (const site of ['https://www.melangea2.com/', 'https://melangea2.com/', 'https://obo-wan.github.io/',
    'https://obo-wan.github.io/Melangea_Prototype-other/', 'https://example.github.io/Melangea_Prototype/']) {
    const page = await renderer([], undefined, '#konzert-demo-jazz-im-hof', site);
    assert.deepEqual(page.requests.map(req => req.url), ['./data/concerts.json']);
    assert.match(page.compact.textContent, /keine Konzerttermine/);
    assert.match(page.cards.textContent, /keine Konzerttermine/);
  }
});
