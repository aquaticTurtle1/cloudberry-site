// Functional checks: demo booking flow, event switch, lead form validation,
// keyboard focus visibility. Screenshots go to "temporary screenshots".
import puppeteer from 'puppeteer';
import path from 'node:path';
const OUT = process.argv[2];
const W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1, isMobile: W < 600, hasTouch: W < 600 });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
await page.evaluateOnNewDocument(() => { Element.prototype.requestPointerLock = () => {}; Element.prototype.setPointerCapture = () => {}; });
await page.goto('http://localhost:4500', { waitUntil: 'networkidle0' });
const log = (...a) => console.log(...a);
const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });

// ---- demo
await page.evaluate(() => document.querySelector('#demo').scrollIntoView({ behavior: 'instant' }));
await new Promise(r => setTimeout(r, 900));
const btn5 = await page.$('.tb:nth-of-type(5)');
const taken = await page.$$eval('.tb', bs => bs.map(b => b.textContent + (b.disabled ? 'x' : '')).join(' '));
log('tables (x=taken):', taken);
const goDisabled = await page.$eval('.book__go', b => b.disabled);
log('book button disabled before pick:', goDisabled);
await page.evaluate(() => [...document.querySelectorAll('.tb')].find(b => b.textContent === '5').click());
await new Promise(r => setTimeout(r, 200));
log('pick line:', await page.$eval('[data-pick]', e => e.textContent));
await page.click('.book__go');
await new Promise(r => setTimeout(r, 200));
log('empty name warn:', await page.$eval('[data-pick]', e => e.textContent), await page.$eval('input[name="guest"]', e => e.getAttribute('aria-invalid')));
await page.type('input[name="guest"]', 'Анна');
await page.click('.book__go');
await new Promise(r => setTimeout(r, 1500));
await shot('demo-pending');
log('chat after submit:', (await page.$eval('[data-chat]', e => e.innerText)).replace(/\s+/g, ' ').slice(0, 220));
await page.evaluate(() => document.querySelector('.key[data-k="yes"]').click());
await new Promise(r => setTimeout(r, 1300));
await shot('demo-confirmed');
log('admin line:', await page.$eval('[data-admin]', e => e.textContent));
log('table 5 yours:', await page.evaluate(() => [...document.querySelectorAll('.tb')].find(b => b.textContent === '5').className));
// switch event
await page.evaluate(() => document.querySelector('#ev-sat').click());
await new Promise(r => setTimeout(r, 200));
log('sat taken:', await page.$$eval('.tb', bs => bs.filter(b => b.disabled).map(b => b.textContent).join(',')));
await page.evaluate(() => document.querySelector('#ev-fri').click());
log('fri table 5 still yours:', await page.evaluate(() => [...document.querySelectorAll('.tb')].find(b => b.textContent === '5').classList.contains('is-yours')));

// ---- lead form
await page.evaluate(() => document.querySelector('#zayavka').scrollIntoView({ behavior: 'instant' }));
await new Promise(r => setTimeout(r, 900));
await page.click('.lead__go');
await new Promise(r => setTimeout(r, 200));
log('lead errors:', await page.$$eval('.field__err', es => es.map(e => e.textContent).filter(Boolean).join(' | ')));
log('focused after invalid:', await page.evaluate(() => document.activeElement.name));
await page.type('input[name="name"]', 'Тимур');
await page.type('input[name="venue"]', 'Джаз-подвал');
await page.type('input[name="whatsapp"]', '+7 900 123-45-67');
await page.click('.lead__go');
await new Promise(r => setTimeout(r, 300));
log('lead status:', await page.$eval('[data-status]', e => e.textContent));
log('url unchanged (no GET leak):', page.url());
await shot('lead-submitted');

// ---- keyboard: tab from top, record focus visibility
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise(r => setTimeout(r, 600));
const stops = [];
for (let i = 0; i < 16; i++) {
  await page.keyboard.press('Tab');
  await new Promise(r => setTimeout(r, 120));
  stops.push(await page.evaluate(() => {
    const a = document.activeElement; const r = a.getBoundingClientRect();
    let op = 1, e = a; while (e) { op *= parseFloat(getComputedStyle(e).opacity); e = e.parentElement; }
    return (a.textContent || a.name || a.tagName).trim().slice(0, 22) + ` [y=${Math.round(r.top)} op=${op.toFixed(2)}]`;
  }));
}
log('tab order:\n  ' + stops.join('\n  '));
log('errors:', errors.length ? errors : 'none');
await browser.close();
