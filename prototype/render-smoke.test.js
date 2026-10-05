// Headless-browser smoke test: the unit tests can pass while the game looks
// broken, so load the review gallery and the demo scene in a real browser and
// assert there are no console errors and that something was actually drawn.
// It needs Playwright and a Chromium build, which the CI job does not install,
// so it skips (visibly) when either is missing. Set CHROMIUM_PATH to point at a
// specific browser binary.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createServer} from 'vite';

let playwright = null;
try { playwright = await import('playwright'); } catch { /* not installed */ }
const browserPath = process.env.CHROMIUM_PATH
  || ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find(existsSync);
const skip = !playwright ? 'playwright is not installed' : (!browserPath && !process.env.PLAYWRIGHT_BROWSERS_PATH ? 'no chromium found' : false);

async function withPage(run) {
  const server = await createServer({configFile: false, logLevel: 'silent', server: {host: '127.0.0.1', port: 0}});
  await server.listen();
  const base = server.resolvedUrls.local[0];
  const browser = await playwright.chromium.launch({
    ...(browserPath && existsSync(browserPath) ? {executablePath: browserPath} : {}),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 800}});
    const problems = [];
    // A generic "Failed to load resource" line names no URL, so report failed responses
    // ourselves (the browser's automatic favicon request is not a game problem).
    page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) problems.push(`console: ${message.text()}`); });
    page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) problems.push(`http ${response.status()}: ${response.url()}`); });
    page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
    await run(page, base, problems);
  } finally {
    await browser.close();
    await server.close();
  }
}

test('item review gallery renders every card with no errors', {skip, timeout: 120000}, () => withPage(async (page, base, problems) => {
  await page.goto(`${base}item-review.html`, {waitUntil: 'load'});
  await page.waitForSelector('figure canvas');
  const cards = await page.$$eval('figure', figures => figures.map(figure => {
    const canvas = figure.querySelector('canvas'), data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i] + data[i + 1] + data[i + 2] > 0) lit++;
    return {name: figure.querySelector('figcaption').textContent, lit};
  }));
  assert.ok(cards.length >= 12, `expected the gallery to hold its cards, got ${cards.length}`);
  for (const card of cards) assert.ok(card.lit > 500, `${card.name} drew almost nothing (${card.lit} lit pixels)`);
  assert.deepEqual(problems, []);
}));

test('demo scene boots, draws a frame and logs no errors', {skip, timeout: 120000}, () => withPage(async (page, base, problems) => {
  await page.goto(`${base}?demo`, {waitUntil: 'load'});
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2500);
  const size = await page.$eval('canvas', canvas => [canvas.width, canvas.height]);
  assert.ok(size[0] > 100 && size[1] > 100, `canvas is ${size}`);
  assert.deepEqual(problems.filter(p => !/WebSocket|\/engine|net::ERR/.test(p)), []);
}));
