// Скриншоты страницы через Puppeteer для самопроверки вёрстки.
// Все файлы сохраняются в папку "temporary screenshots" (создаётся автоматически).
//
// Использование:
//   node screenshot.mjs <url|путь к html> [метка] [опции]
//
// Опции:
//   --width=1440 --height=900   размер вьюпорта (по умолчанию 1440x900)
//   --mobile                    вьюпорт телефона 390x844, deviceScaleFactor 2
//   --full                      скриншот всей страницы целиком
//   --scroll=0,25,50,75,100     серия кадров на позициях скролла (в % от высоты)
//   --reduced-motion            эмулировать prefers-reduced-motion: reduce
//   --wait=800                  пауза (мс) после каждого скролла, чтобы анимации догнали
//
// Примеры:
//   node screenshot.mjs http://localhost:4500 hero
//   node screenshot.mjs index.html full --full
//   node screenshot.mjs http://localhost:4500 mobile --mobile --scroll=0,20,40,60,80,100

import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, 'temporary screenshots');

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? true];
    }),
);

const target = positional[0];
if (!target) {
  console.error('Укажи URL или путь к HTML: node screenshot.mjs <url|файл> [метка] [опции]');
  process.exit(1);
}

const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(path.resolve(target)).href;
const label = (positional[1] ?? 'shot').replace(/[^\w.-]+/g, '-');
const mobile = Boolean(flags.mobile);
const width = Number(flags.width ?? (mobile ? 390 : 1440));
const height = Number(flags.height ?? (mobile ? 844 : 900));
const wait = Number(flags.wait ?? 800);

fs.mkdirSync(outDir, { recursive: true });

// Порядковый номер, чтобы новые скриншоты не затирали старые.
const nextIndex =
  fs
    .readdirSync(outDir)
    .map((f) => parseInt(f, 10))
    .filter(Number.isFinite)
    .reduce((max, n) => Math.max(max, n), 0) + 1;
const prefix = String(nextIndex).padStart(3, '0');

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  if (flags['reduced-motion']) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  }

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, wait));

  const saved = [];
  const shoot = async (name, opts = {}) => {
    const file = path.join(outDir, `${prefix}-${label}${name ? `-${name}` : ''}.png`);
    await page.screenshot({ path: file, ...opts });
    saved.push(file);
  };

  if (flags.scroll) {
    const positions = String(flags.scroll).split(',').map(Number);
    for (const pct of positions) {
      await page.evaluate((p) => {
        const max = document.documentElement.scrollHeight - innerHeight;
        window.scrollTo(0, (max * p) / 100);
      }, pct);
      await new Promise((r) => setTimeout(r, wait));
      await shoot(`scroll${pct}`);
    }
  } else {
    await shoot('', { fullPage: Boolean(flags.full) });
  }

  for (const f of saved) console.log(path.relative(root, f));
} finally {
  await browser.close();
}
