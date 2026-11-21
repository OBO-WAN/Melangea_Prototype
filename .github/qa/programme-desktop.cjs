const { chromium } = require(process.env.QA_NODE_MODULES + '/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const output = process.env.QA_OUTPUT || '/tmp/programme-desktop-qa';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.QA_CHROME || '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  const failedLocal = [];
  const results = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith('http://127.0.0.1:8765/') && response.status() >= 400) failedLocal.push({ url: response.url(), status: response.status() });
  });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:8765/')) return route.continue();
    external.push(url);
    if (url.includes('youtube-nocookie.com/embed/')) return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;display:grid;place-items:center;height:100vh;background:#101726;color:#eee;font:16px sans-serif">YouTube embed: layout test</body></html>' });
    return route.abort();
  });
  await page.addInitScript(() => localStorage.setItem('melangea2_consent_v2', JSON.stringify({ version: 2, savedAt: Date.now(), analytics: false, externalMedia: false })));
  await page.goto('http://127.0.0.1:8765/programme.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => [...document.fonts].map(font => ({ family: font.family, status: font.status })));
  assert(fonts.some(font => font.family === 'Andantino' && font.status === 'loaded'), 'Script title font not loaded');
  assert(fonts.some(font => font.family === 'Raleway' && font.status === 'loaded'), 'Body font not loaded');
  const cards = page.locator('.programmes-list > article:not(.programmes-programme--child)');
  assert.equal(await cards.count(), 4);
  assert.equal(await page.locator('.programmes-programme--child').count(), 2);
  assert.equal(await cards.locator('details').count(), 2);
  const videoIds = ['OX8V84pZxeg', 'ePEIErvA09c', 'U7E0V9A5-LI', 'pn2mitUf5Bw'];
  for (let index = 0; index < 4; index++) assert((await cards.nth(index).locator('iframe').getAttribute('data-consent-src')).endsWith('/' + videoIds[index]));
  assert.equal(await cards.locator('[data-external-media-settings]').count(), 4);
  assert.equal(external.filter(url => url.includes('youtube')).length, 0);

  async function inspect(width, state) {
    const measurements = await cards.evaluateAll(elements => elements.map((card, index) => {
      const rect = card.getBoundingClientRect();
      const out = [];
      for (const node of card.querySelectorAll('h3, p, summary, .video-embed, iframe')) {
        // Closed details descendants have layout boxes but are not rendered.
        const details = node.closest('details');
        if (details && !details.open && !node.closest('summary')) continue;
        const r = node.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.left < rect.left - 1 || r.right > rect.right + 1 || r.top < rect.top - 1 || r.bottom > rect.bottom + 1) out.push({ tag: node.tagName, class: node.className, x: r.x, y: r.y, width: r.width, height: r.height });
      }
      const video = card.querySelector('.video-embed').getBoundingClientRect();
      return { index: index + 1, top: rect.top + scrollY, bottom: rect.bottom + scrollY, width: rect.width, height: rect.height, videoWidth: video.width, videoHeight: video.height, overflow: out, textAlign: getComputedStyle(card.querySelector('.programmes-programme__content')).textAlign };
    }));
    const pageWidth = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert(pageWidth.scroll <= pageWidth.viewport, `Horizontal page overflow at ${width}/${state}: ${JSON.stringify(pageWidth)}`);
    for (const card of measurements) {
      assert.equal(card.overflow.length, 0, `Card ${card.index} overflows at ${width}/${state}: ${JSON.stringify(card.overflow)}`);
      assert(Math.abs(card.videoWidth / card.videoHeight - 16 / 9) < 0.01, `Video aspect ratio at ${width}/${state}`);
    }
    for (let index = 1; index < measurements.length; index++) assert(measurements[index].top >= measurements[index - 1].bottom, `Cards overlap at ${width}/${state}`);
    assert.equal(measurements[0].textAlign, 'left');
    assert.equal(measurements[1].textAlign, 'left');
    results.push({ width, state, measurements });
    return measurements;
  }

  for (const width of [1024, 1280, 1440, 1920, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const details of await cards.locator('details').all()) await details.evaluate(element => { element.open = false; });
    await page.waitForTimeout(150);
    const closed = await inspect(width, 'closed');
    for (const index of [0, 1]) {
      const card = cards.nth(index);
      const summary = card.locator('summary');
      assert((await summary.boundingBox()).height >= 44, `Small summary target at ${width}`);
      if ([1280, 1440, 1920, 390].includes(width)) await card.screenshot({ path: path.join(output, `programme-${index + 1}-${width}-closed.png`) });
      await summary.focus();
      await page.keyboard.press('Enter');
      assert(await card.locator('details').evaluate(element => element.open), `Keyboard expansion failed at ${width}`);
      assert.equal((await summary.innerText()).trim(), 'Weniger anzeigen');
    }
    const opened = await inspect(width, 'open');
    for (const index of [0, 1]) {
      assert(opened[index].height > closed[index].height, `Frame did not grow for ${width}/card ${index + 1}`);
      if ([1280, 1440, 390].includes(width)) await cards.nth(index).screenshot({ path: path.join(output, `programme-${index + 1}-${width}-open.png`) });
      await cards.nth(index).locator('summary').click();
      assert.equal(await cards.nth(index).locator('details').evaluate(element => element.open), false);
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await cards.nth(0).locator('[data-external-media-settings]').click();
  await page.locator('[data-consent-external-media]').check();
  await page.locator('[data-consent-save]').click();
  for (let index = 0; index < 4; index++) assert.equal(await cards.nth(index).locator('iframe').getAttribute('src'), 'https://www.youtube-nocookie.com/embed/' + videoIds[index]);
  await inspect(1440, 'media-enabled');
  await cards.nth(0).screenshot({ path: path.join(output, 'programme-1-1440-media-enabled.png') });
  assert.equal(failedLocal.length, 0, `Missing local resources: ${JSON.stringify(failedLocal)}`);
  assert.equal(errors.length, 0, `Browser errors: ${JSON.stringify(errors)}`);
  const report = { result: 'PASS', browser: await browser.version(), fonts, viewports: [1024, 1280, 1440, 1920, 390], states: ['closed', 'open'], keyboardToggle: 'PASS', consentFlow: 'PASS', note: 'External video requests were stubbed. Playback is outside this layout check.', errors, failedLocal, results };
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
})().catch(error => { fs.writeFileSync(path.join(output, 'failure.txt'), error.stack); console.error(error); process.exit(1); });
