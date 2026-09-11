# CLAUDE.md

## Правила проекта

### Вёрстка сайта — ОБЯЗАТЕЛЬНО скилл scroll-craft

Перед любой вёрсткой сайта в этом проекте (новые страницы, секции, hero, анимации при скролле, переделка дизайна) **обязательно** вызывай скилл `/nateherk-design:scroll-craft` через инструмент Skill и следуй его инструкциям.

- Не начинай писать HTML/CSS/JS страницы, пока скилл не загружен.
- Это правило действует на всех этапах: планирование, вёрстка, правки, проверка на desktop / mobile / reduced-motion.

### Самопроверка через скриншоты (Puppeteer) — ОБЯЗАТЕЛЬНО

В проекте установлен Puppeteer (`devDependencies` в `package.json`, Chrome скачан в `~/.cache/puppeteer`). При вёрстке любого нового сайта или правках существующего **сам делай скриншоты, смотри на них и улучшай работу** — не сдавай вёрстку, которую ни разу не видел.

Цикл работы:
1. Сверстал или изменил секцию → сделал скриншот.
2. Открыл PNG через Read и честно оценил: композиция, отступы, типографика, контраст, читаемость, поломки.
3. Исправил найденное → снова скриншот. Повторяй, пока результат не станет хорошим.
4. Обязательно проверяй desktop, mobile и несколько позиций скролла (для scroll-сайтов состояние между кадрами тоже важно).

Готовый скрипт [screenshot.mjs](screenshot.mjs):

```bash
node screenshot.mjs http://localhost:4500 hero                                   # один кадр 1440x900
node screenshot.mjs index.html full --full                                        # вся страница целиком
node screenshot.mjs http://localhost:4500 desktop --scroll=0,20,40,60,80,100      # серия по позициям скролла
node screenshot.mjs http://localhost:4500 mobile --mobile --scroll=0,25,50,75,100 # телефон 390x844
node screenshot.mjs http://localhost:4500 reduced --reduced-motion                # prefers-reduced-motion
```

Доп. опции: `--width=`, `--height=`, `--wait=` (пауза в мс после скролла, по умолчанию 800).
Если Puppeteer или Chrome пропали: `npm i -D puppeteer` и `npx puppeteer browsers install chrome`.

### Куда сохранять скриншоты — папка `temporary screenshots`

- **Все** скриншоты, которые делаешь для проверки и улучшения своей работы, сохраняй в папку `temporary screenshots` в корне проекта.
- Если папки `temporary screenshots` нет — **сначала создай её**, потом сохраняй туда скриншоты.
- Правило касается любых инструментов: `screenshot.mjs`, собственный код на Puppeteer, скрипты из скилла scroll-craft (`shoot.mjs` и т.п. — передавай им `--out "temporary screenshots/..."`).
- Не складывай скриншоты в корень проекта, в папку сборки или куда-то ещё.
