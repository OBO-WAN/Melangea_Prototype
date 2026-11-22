const { chromium } = require(process.env.QA_NODE_MODULES + '/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = process.env.QA_OUTPUT;
fs.mkdirSync(output, { recursive: true });
const measurements = [];

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [], missing = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().startsWith('http://127.0.0.1:8765/') && response.status() >= 400) missing.push(response.url()); });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:8765/')) return route.continue();
    external.push(url);
    if (url.includes('youtube-nocookie.com/embed/')) return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#101726;color:white;display:grid;place-items:center;height:100vh;font:16px sans-serif">YouTube embed: layout test</body></html>' });
    return route.abort();
  });
  await page.addInitScript(() => localStorage.setItem('melangea2_consent_v2', JSON.stringify({ version: 2, savedAt: Date.now(), analytics: false, externalMedia: false })));
  await page.goto('http://127.0.0.1:8765/programme.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  assert(await page.evaluate(() => [...document.fonts].filter(font => ['Andantino', 'Raleway'].includes(font.family)).every(font => font.status === 'loaded')), 'Fonts not loaded');
  const cards = page.locator('article.programmes-programme');
  const adult = cards.filter({ has: page.locator('details') });
  assert.equal(await cards.count(), 6);
  assert.equal(await adult.count(), 4);
  assert.equal(await page.locator('.programmes-children > article').count(), 2);
  assert.equal(await page.locator('.programmes-video').count(), 0);
  assert.equal(await page.locator('[data-external-media-settings]').count(), 6);
  const ids = ['OX8V84pZxeg', 'ePEIErvA09c', 'U7E0V9A5-LI', 'pn2mitUf5Bw', 'qNYEwVL6Sg0', 'tJl507Crlw8'];
  for (let index = 0; index < 6; index++) {
    assert.equal(await cards.nth(index).locator('iframe').count(), 1);
    assert((await cards.nth(index).locator('iframe').getAttribute('data-consent-src')).endsWith('/' + ids[index]));
    assert.equal(await cards.nth(index).locator('details iframe').count(), 0, 'Video hidden in expandable text');
  }

  async function inspect(width, state) {
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page overflow: ${width}/${state}`);
    const values = await cards.evaluateAll(elements => elements.map(card => {
      const rect = card.getBoundingClientRect();
      const content = card.querySelector('.programmes-programme__content').getBoundingClientRect();
      const video = card.querySelector('.video-embed').getBoundingClientRect();
      const overflow = [];
      for (const element of card.querySelectorAll('h3, p, summary, .video-embed')) {
        const details = element.closest('details');
        if (details && !details.open && !element.closest('summary')) continue;
        const r = element.getBoundingClientRect();
        if (r.width && r.height && (r.left < rect.left - 1 || r.right > rect.right + 1 || r.top < rect.top - 1 || r.bottom > rect.bottom + 1)) overflow.push(element.tagName + '.' + element.className);
      }
      return {
        title: card.querySelector('h3').textContent.trim(), top: rect.top + scrollY, bottom: rect.bottom + scrollY, height: rect.height,
        videoWidth: video.width, videoHeight: video.height, centered: Math.abs(video.left + video.width / 2 - content.left - content.width / 2) < 1,
        videoInsideCard: video.left >= rect.left && video.right <= rect.right && video.top >= rect.top && video.bottom <= rect.bottom,
        justified: [...card.querySelectorAll('p')].every(p => getComputedStyle(p).textAlign === 'justify'), overflow,
      };
    }));
    for (const value of values) {
      assert.equal(value.overflow.length, 0, `${width}/${state}/${value.title}: ${JSON.stringify(value.overflow)}`);
      assert(value.videoInsideCard && value.centered, `${width}/${state}: video outside card or not centered`);
      assert(value.videoWidth <= 576.1 && Math.abs(value.videoWidth / value.videoHeight - 16 / 9) < 0.01, `${width}/${state}: video dimensions`);
      assert(value.justified, `${width}/${state}: paragraphs not justified`);
    }
    for (let index = 1; index < values.length; index++) assert(values[index].top >= values[index - 1].bottom, `${width}/${state}: cards overlap`);
    measurements.push({ width, state, cards: values });
    fs.writeFileSync(path.join(output, 'measurements.json'), JSON.stringify(measurements, null, 2));
    return values;
  }

  async function capture(card, filename) {
    const viewport = page.viewportSize();
    await page.setViewportSize({ width: viewport.width, height: 3200 });
    await card.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - document.querySelector('.site-header').getBoundingClientRect().height - 24));
    await page.waitForTimeout(250);
    await card.screenshot({ path: path.join(output, filename) });
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
  }

  for (const width of [1920, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(250);
    await page.locator('details').evaluateAll(elements => elements.forEach(element => { element.open = false; }));
    const closed = await inspect(width, 'closed');
    if ([1440, 390].includes(width)) for (const index of [2, 3, 4, 5]) await capture(cards.nth(index), `card-${index + 1}-${width}-closed.png`);
    for (const card of await adult.all()) {
      const summary = card.locator('summary');
      assert((await summary.boundingBox()).height >= 44, 'Disclosure target too small');
      await summary.focus();
      await page.keyboard.press('Enter');
      assert(await card.locator('details').evaluate(element => element.open), 'Keyboard toggle failed');
      assert.equal((await summary.innerText()).trim(), 'Weniger anzeigen');
    }
    const expanded = await inspect(width, 'expanded');
    for (let index = 0; index < 4; index++) assert(expanded[index].height > closed[index].height, 'Expanded card frame did not grow');
    if ([1440, 390].includes(width)) for (const index of [2, 3]) await capture(cards.nth(index), `card-${index + 1}-${width}-expanded.png`);
    for (const summary of await adult.locator('summary').all()) {
      await summary.click();
      assert.equal((await summary.innerText()).trim(), 'Mehr zum Programm');
    }
  }

  assert.equal(external.filter(url => url.includes('youtube')).length, 0, 'Video requested without consent');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(250);
  await cards.nth(4).locator('[data-external-media-settings]').click();
  await page.locator('[data-consent-external-media]').check();
  await page.locator('[data-consent-save]').click();
  for (const iframe of await cards.locator('iframe').all()) assert.equal(await iframe.getAttribute('src'), await iframe.getAttribute('data-consent-src'));
  await inspect(1440, 'media-enabled');
  await capture(cards.nth(4), 'card-5-1440-media-enabled.png');
  assert.equal(errors.length, 0, `Browser errors: ${JSON.stringify(errors)}`);
  assert.equal(missing.length, 0, `Missing assets: ${JSON.stringify(missing)}`);
  const report = { result: 'PASS', browser: await browser.version(), adultDisclosures: 4, childVideosInsideCards: 2, viewports: [1920, 1440, 1024, 768, 390, 320], keyboardAndMouseToggles: 'PASS', videoConsentFlow: 'PASS', errors, missing, note: 'External video requests were stubbed for layout checks. Playback was not tested.' };
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
})().catch(error => { fs.writeFileSync(path.join(output, 'failure.txt'), error.stack); console.error(error); process.exit(1); });
