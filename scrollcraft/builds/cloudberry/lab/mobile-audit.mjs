// Phone audit: horizontal overflow, tap targets, touch booking, video load.
import puppeteer from 'puppeteer';
const [W, H] = [+(process.argv[2] || 390), +(process.argv[3] || 844)];
const b = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await b.newPage();
await p.setViewport({ width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
p.on('response', r => { if (!r.ok() && r.status() !== 304) errs.push(r.status() + ' ' + r.url().split('/').pop()); });
await p.goto('http://localhost:4500', { waitUntil: 'networkidle0' });
console.log(`== ${W}x${H}`);

// 1. horizontal overflow at several depths
const over = await p.evaluate(async () => {
  const out = [];
  const doc = document.scrollingElement;
  for (const f of [0, .15, .3, .45, .6, .75, .9, 1]) {
    window.scrollTo(0, (doc.scrollHeight - innerHeight) * f);
    await new Promise(r => setTimeout(r, 260));
    const wide = [...document.querySelectorAll('body *')].filter(e => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > innerWidth + 1.5 || r.left < -1.5) && getComputedStyle(e).position !== 'fixed'
        && !e.closest('[data-sc-pan]') && !e.closest('.sc-stage') && !e.closest('.hero__stage');
    }).map(e => e.className || e.tagName);
    out.push([f, doc.scrollWidth - doc.clientWidth, wide.slice(0, 3).join('|')]);
  }
  return out;
});
console.log('overflow (scroll frac, extra px, offenders):');
over.forEach(o => console.log('  ', o[0], o[1], o[2] || ''));

// 2. tap targets in the demo
await p.evaluate(() => document.querySelector('#demo').scrollIntoView({ behavior: 'instant' }));
await new Promise(r => setTimeout(r, 900));
const targets = await p.evaluate(() => {
  const probe = (sel) => [...document.querySelectorAll(sel)].map(e => {
    const r = e.getBoundingClientRect();
    let w = r.width, h = r.height;
    const a = getComputedStyle(e, '::after');
    if (a && a.content !== 'none') {
      const ins = parseFloat(a.insetBlockStart || a.top);
      if (!isNaN(ins) && ins < 0) { w += -2 * ins; h += -2 * ins; }
      w = Math.max(w, parseFloat(a.minWidth) || 0); h = Math.max(h, parseFloat(a.minHeight) || 0);
    }
    return Math.round(Math.min(w, h));
  });
  return { tables: probe('.tb'), events: probe('.ev label'), keysBtn: probe('.book__go'), hud: probe('.hud') };
});
console.log('min tap size px:', JSON.stringify(targets));

// 3. real touch booking
await p.evaluate(() => { const t = [...document.querySelectorAll('.tb')].find(x => !x.disabled); t.scrollIntoView({ block: 'center', behavior: 'instant' }); });
await new Promise(r => setTimeout(r, 400));
const box = await p.evaluate(() => { const t = [...document.querySelectorAll('.tb')].find(x => !x.disabled); const r = t.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, n: t.textContent }; });
await p.touchscreen.tap(box.x, box.y);
await new Promise(r => setTimeout(r, 300));
console.log('tapped table', box.n, '→', await p.$eval('[data-pick]', e => e.textContent));
await p.type('input[name="guest"]', 'Анна');
await p.evaluate(() => document.querySelector('.book__go').click());
await new Promise(r => setTimeout(r, 1400));
await p.evaluate(() => document.querySelector('.key[data-k="yes"]').click());
await new Promise(r => setTimeout(r, 1200));
console.log('chat tail:', (await p.$eval('[data-chat]', e => e.innerText)).replace(/\s+/g, ' ').slice(-90));

// 4. media actually loaded
const media = await p.evaluate(() => [...document.querySelectorAll('video')].map(v => ({
  src: (v.currentSrc || v.getAttribute('data-src') || '').split('/').pop(), w: v.videoWidth, h: v.videoHeight, paused: v.paused })));
console.log('videos:', JSON.stringify(media));
console.log('errors:', errs.length ? errs.slice(0, 6) : 'none');
await b.close();
