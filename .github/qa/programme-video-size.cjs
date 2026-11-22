const { chromium } = require(process.env.QA_NODE_MODULES + '/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const output = process.env.QA_OUTPUT;
const baselineCss = fs.readFileSync('.github/qa/programme-before.css', 'utf8');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const missing = [];
  const external = [];
  const results = {};
  let baseline = true;
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().startsWith('http://127.0.0.1:8765/') && response.status() >= 400) missing.push(response.url()); });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:8765/')) {
      if (baseline && url.endsWith('/css/subpages/programme.css')) return route.fulfill({ status: 200, contentType: 'text/css', body: baselineCss });
      return route.continue();
    }
    external.push(url);
    if (url.includes('youtube-nocookie.com/embed/')) return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#101726;color:white;display:grid;place-items:center;height:100vh;font:16px sans-serif">YouTube embed: layout test</body></html>' });
    return route.abort();
  });
  await page.addInitScript(() => {
    if (!localStorage.getItem('melangea2_consent_v2')) localStorage.setItem('melangea2_consent_v2', JSON.stringify({ version: 2, savedAt: Date.now(), analytics: false, externalMedia: false }));
  });
  const frames = page.locator('.programmes-programme__video, .programmes-video__embed');
  const cards = page.locator('.programmes-list > article:not(.programmes-programme--child)');

  async function inspect(label, width) {
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Page overflow at ${label}/${width}`);
    const measured = await frames.evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      const parent = element.parentElement.getBoundingClientRect();
      const iframe = element.querySelector('iframe').getBoundingClientRect();
      const prompt = element.querySelector('.video-consent-prompt');
      const button = prompt?.querySelector('.video-consent-prompt__action');
      const copy = prompt?.querySelector('.video-consent-prompt__copy');
      return {
        title: element.querySelector('iframe').title,
        child: element.classList.contains('programmes-video__embed'),
        width: rect.width,
        height: rect.height,
        x: rect.x,
        parentWidth: parent.width,
        centered: Math.abs((rect.left + rect.right) / 2 - (parent.left + parent.right) / 2) < 1,
        inParent: rect.left >= parent.left - 1 && rect.right <= parent.right + 1,
        iframeInside: iframe.left >= rect.left && iframe.right <= rect.right && iframe.top >= rect.top && iframe.bottom <= rect.bottom,
        promptFits: !prompt || (prompt.scrollWidth <= prompt.clientWidth + 1 && prompt.scrollHeight <= prompt.clientHeight + 1),
        actionVisible: !button || (button.getBoundingClientRect().top >= rect.top && button.getBoundingClientRect().bottom <= rect.bottom),
        copyVisible: !copy || (copy.getBoundingClientRect().top >= rect.top && copy.getBoundingClientRect().bottom <= rect.bottom),
      };
    }));
    assert.equal(measured.length, 6);
    for (const frame of measured) {
      assert(frame.inParent, `${label}/${width}: frame extends beyond parent`);
      assert(frame.iframeInside, `${label}/${width}: player extends beyond frame`);
      assert(Math.abs(frame.width / frame.height - 16 / 9) < 0.01, `${label}/${width}: distorted video`);
      if (frame.child) assert(frame.centered, `${label}/${width}: child video lost centering`);
      if (label !== 'before') {
        assert(frame.centered, `${label}/${width}: programme video is not centered`);
        assert(frame.width <= 576.1, `${label}/${width}: video larger than 36rem`);
        if (width >= 768) {
          assert(Math.abs(frame.width - 576) < 0.1, `${label}/${width}: inconsistent desktop width`);
          assert(frame.promptFits && frame.actionVisible && frame.copyVisible, `${label}/${width}: consent text clipped`);
        }
      }
    }
    results[`${label}-${width}`] = measured;
    return measured;
  }

  async function capture(locator, filename) {
    const viewport = page.viewportSize();
    await page.setViewportSize({ width: viewport.width, height: 2400 });
    await locator.evaluate(element => {
      const headerHeight = document.querySelector('.site-header').getBoundingClientRect().height;
      window.scrollTo(0, element.getBoundingClientRect().top + scrollY - headerHeight - 24);
    });
    await page.waitForTimeout(100);
    await locator.screenshot({ path: path.join(output, filename) });
    await page.setViewportSize(viewport);
  }

  for (const mode of ['before', 'after']) {
    baseline = mode === 'before';
    await page.goto('http://127.0.0.1:8765/programme.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await frames.locator('[data-external-media-settings]').count(), 6);
    for (const width of [320, 390, 568, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      const measured = await inspect(mode, width);
      if (mode === 'after') {
        for (let index = 0; index < 6; index++) {
          const previous = results[`before-${width}`][index];
          if (width <= 568) assert(Math.abs(measured[index].width - previous.width) < 0.1, `Mobile width changed at ${width}`);
          if (width >= 768) assert(measured[index].width < previous.width, `Desktop video did not shrink at ${width}`);
        }
      }
      if (width === 1440) {
        await capture(page.locator('.programmes-video').nth(0), `${mode}-child-1-desktop.png`);
        await capture(page.locator('.programmes-video').nth(1), `${mode}-child-2-desktop.png`);
        await capture(cards.nth(0), `${mode}-adult-1-desktop.png`);
      }
      if (width === 390 && mode === 'after') {
        await capture(page.locator('.programmes-video').nth(0), 'after-child-1-mobile.png');
        await capture(cards.nth(0), 'after-adult-1-mobile.png');
      }
    }
  }
  assert.equal(external.filter(url => url.includes('youtube')).length, 0, 'Videos loaded before consent');

  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const card of await cards.all()) {
    const summary = card.locator('summary');
    if (await summary.count()) {
      await summary.focus();
      await page.keyboard.press('Enter');
      assert(await card.locator('details').evaluate(element => element.open));
    }
    const within = await card.evaluate(element => {
      const cardRect = element.getBoundingClientRect();
      const videoRect = element.querySelector('.video-embed').getBoundingClientRect();
      return videoRect.left >= cardRect.left && videoRect.right <= cardRect.right && videoRect.bottom <= cardRect.bottom;
    });
    assert(within, 'Expanded programme video outside card');
  }
  await inspect('expanded', 1440);
  await frames.nth(0).locator('[data-external-media-settings]').click();
  await page.locator('[data-consent-external-media]').check();
  await page.locator('[data-consent-save]').click();
  for (const iframe of await frames.locator('iframe').all()) assert.equal(await iframe.getAttribute('src'), await iframe.getAttribute('data-consent-src'));
  await inspect('media-enabled', 1440);
  await capture(page.locator('.programmes-video').nth(0), 'after-child-1-media-enabled.png');

  assert.equal(errors.length, 0, `Browser errors: ${JSON.stringify(errors)}`);
  assert.equal(missing.length, 0, `Missing local assets: ${JSON.stringify(missing)}`);
  const report = { result: 'PASS', browser: await browser.version(), frameCount: 6, viewports: [320, 390, 568, 768, 1024, 1440, 1920], desktopSize: '576 x 324', mobileWidthsUnchanged: true, consentFlow: 'PASS', errors, missing, note: 'External player requests were stubbed for layout checks; playback was not tested.', measurements: results };
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, measurements: undefined }));
  await browser.close();
})().catch(error => { fs.writeFileSync(path.join(output, 'failure.txt'), error.stack); console.error(error); process.exit(1); });
