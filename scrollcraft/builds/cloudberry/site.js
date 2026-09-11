/* Cloudberry. Page-local behaviour. The engine (scrollcraft.js) is untouched;
   everything bespoke lives here and reads the engine's act progress. */
(function () {
  'use strict';

  // Where lead submissions go. POST JSON {name, venue, whatsapp}. Until this is
  // set, the form never claims a success it did not have.
  var CONFIG = { leadEndpoint: '' };

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var smallMQ = matchMedia('(max-width: 860px)');
  var root = document.documentElement;
  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // A rail's travel is its overflow, and on a phone the cards are far wider
  // relative to the screen: the same span would fly the whole lineup past in a
  // fraction of the scroll it takes on a desktop. Lengthen the act before mount.
  if (smallMQ.matches) {
    var rushEl = document.getElementById('rush');
    if (rushEl) rushEl.setAttribute('data-sc-span', '3.4');
  }

  var sc = ScrollCraft.mount(document.body);
  function act(id) { for (var i = 0; i < sc.acts.length; i++) if (sc.acts[i].el.id === id) return sc.acts[i]; return null; }
  var A = { hero: act('hero'), signal: act('signal'), proof: act('proof'), rush: act('rush'), peak: act('peak'), why: act('why') };

  /* ======================================================= the floor plan ==
     One room, twelve tables. Coordinates are percent of a 240x170 room. */
  var TABLES = [
    { n: 1,  x: 20, y: 25, k: 'r', seats: 2 },
    { n: 2,  x: 80, y: 25, k: 'r', seats: 2 },
    { n: 3,  x: 23, y: 50, k: 'R', seats: 4 },
    { n: 4,  x: 42, y: 50, k: 'q', seats: 4 },
    { n: 5,  x: 58, y: 50, k: 'q', seats: 4 },
    { n: 6,  x: 78, y: 50, k: 'r', seats: 2 },
    { n: 7,  x: 23, y: 74, k: 'r', seats: 2 },
    { n: 8,  x: 42, y: 74, k: 'q', seats: 4 },
    { n: 9,  x: 60, y: 74, k: 'Q', seats: 6 },
    { n: 10, x: 80, y: 74, k: 'r', seats: 2 },
    { n: 11, x: 41, y: 92, k: 'b', seats: 6 },
    { n: 12, x: 79, y: 92, k: 'r', seats: 2 }
  ];
  // shape sizes in room units (240 wide)
  var SIZE = { r: [16, 16], R: [20, 20], q: [22, 18], Q: [30, 18], b: [44, 12] };
  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function planSVG(opts) {
    opts = opts || {};
    var svg = el('svg', { viewBox: '0 0 240 170', class: 'plan', 'aria-hidden': 'true' });
    // walls with a door gap on the right
    el('rect', { class: 'plan__floor', x: 3, y: 3, width: 234, height: 164, rx: 11 }, svg);
    el('path', { class: 'plan__room', d: 'M237 128 V14 Q237 3 226 3 H14 Q3 3 3 14 V156 Q3 167 14 167 H226 Q237 167 237 156 V150' }, svg);
    el('rect', { class: 'plan__fix', x: 78, y: 8, width: 84, height: 16, rx: 4 }, svg);
    el('rect', { class: 'plan__fix', x: 7, y: 54, width: 12, height: 92, rx: 4 }, svg);
    if (opts.labels) {
      el('text', { class: 'plan__lbl', x: 120, y: 19, 'text-anchor': 'middle' }, svg).textContent = 'сцена';
      var bar = el('text', { class: 'plan__lbl', x: 13, y: 100, 'text-anchor': 'middle', transform: 'rotate(-90 13 100)' }, svg);
      bar.textContent = 'бар';
    }
    if (!opts.tables) return svg;
    TABLES.forEach(function (t) {
      var g = el('g', { class: 'pt', 'data-t': t.n }, svg);
      var cx = t.x * 2.4, cy = t.y * 1.7, s = SIZE[t.k];
      if (t.k === 'r' || t.k === 'R') el('circle', { class: 'pt__shape', cx: cx, cy: cy, r: s[0] / 2 }, g);
      else el('rect', { class: 'pt__shape', x: cx - s[0] / 2, y: cy - s[1] / 2, width: s[0], height: s[1], rx: 3.5 }, g);
    });
    return svg;
  }

  /* ============================================ HUD: the story books tables */
  var hud = $('.hud');
  var hudStatus = $('.hud__status');
  var hudPlan = planSVG({ tables: true });
  $('[data-plan="hud"]').appendChild(hudPlan);
  var hudTables = {};
  $$('.pt', hudPlan).forEach(function (g) { hudTables[g.getAttribute('data-t')] = { g: g, s: '' }; });

  var closePlan = planSVG({ tables: true, labels: true });
  $('[data-plan="close"]').appendChild(closePlan);
  $$('.pt', closePlan).forEach(function (g) {
    g.classList.add(g.getAttribute('data-t') === '12' ? 'is-yours' : 'is-arrived');
  });

  var WAVE = [3, 4, 5, 8, 2, 7, 10];
  function storyState() {
    var t = {}, status = 'Зал пуст', state = 'empty';
    if (A.signal.p >= 0.4) { t[6] = 'booked'; status = 'Новая бронь · стол 6'; state = 'busy'; }
    if (A.proof.p >= 0.56) { t[6] = 'arrived'; status = 'Анна пришла · стол 6'; }
    if (A.rush.p >= 0.18) { t[9] = 'arrived'; status = 'Гости идут'; }
    if (A.rush.p >= 0.42) t[1] = 'arrived';
    if (A.rush.p >= 0.66) t[11] = 'arrived';
    if (A.peak.p > 0.04) {
      var k = Math.floor(clamp01((A.peak.p - 0.04) / 0.3) * WAVE.length + 1e-6);
      for (var i = 0; i < k; i++) t[WAVE[i]] = 'arrived';
      status = k >= WAVE.length ? 'Полный зал' : 'Зал заполняется';
      if (k >= WAVE.length) state = 'full';
    }
    if (A.why.raw > 0 || A.peak.p >= 0.92) { t[12] = 'yours'; status = 'Остался один стол'; state = 'full'; }
    return { t: t, status: status, state: state };
  }

  var lastStatus = '';
  function renderHud() {
    var s = storyState();
    TABLES.forEach(function (tb) {
      var rec = hudTables[tb.n], next = s.t[tb.n] || '';
      if (rec.s === next) return;
      rec.g.classList.remove('is-booked', 'is-arrived', 'is-yours');
      if (next) rec.g.classList.add('is-' + next);
      if (next && !reduce && (next === 'booked' || (next === 'arrived' && rec.s !== 'booked'))) {
        rec.g.classList.remove('is-new'); void rec.g.getBoundingClientRect(); rec.g.classList.add('is-new');
        setTimeout(function () { rec.g.classList.remove('is-new'); }, 720);
      }
      rec.s = next;
    });
    if (s.status !== lastStatus) { hudStatus.textContent = s.status; lastStatus = s.status; }
    hud.setAttribute('data-state', s.state);

    var demoTop = $('#demo').getBoundingClientRect().top;
    var hide = demoTop < innerHeight * 0.6;
    if (smallMQ.matches) {
      // On a phone the plan costs vertical room two acts cannot spare: the hero
      // (title + log + CTA) and the five-step route.
      if (A.signal.raw === 0 && A.hero.el.getBoundingClientRect().bottom > innerHeight * 0.5) hide = true;
      var whyR = A.why.el.getBoundingClientRect();
      if (whyR.top < innerHeight * 0.55 && whyR.bottom > innerHeight * 0.45) hide = true;
    }
    hud.classList.toggle('is-hidden', hide);
    hud.tabIndex = hide ? -1 : 0;
  }

  /* ============================================== hero: the call log ====== */
  var logRows = $$('.calllog__list li');
  // two refusals are already on the log when the page lands, so the landing
  // frame tells the story before the reader does anything
  var LOG = [[-1, 0], [-1, 0], [0, 0.14], [0.14, 0.28], [0.28, 0.42]];
  function renderLog() {
    var p = A.hero.p;
    logRows.forEach(function (li, i) {
      var w = LOG[i], calling = p >= w[0] && p < w[1], struck = p >= w[1];
      li.classList.toggle('is-calling', calling);
      li.classList.toggle('is-struck', struck);
    });
  }

  /* ================================================== signal: the buzz ==== */
  var notif = $('.notif'), buzzed = false;
  function renderSignal() {
    var on = A.signal.p >= 0.37 && A.signal.p < 0.95;
    if (on && !buzzed) {
      buzzed = true;
      if (!reduce) { notif.classList.remove('is-buzz'); void notif.offsetWidth; notif.classList.add('is-buzz'); }
    } else if (!on && A.signal.p < 0.3) buzzed = false;
  }

  /* ================================================ one loop for scroll ==== */
  var queued = false;
  function frame() { queued = false; renderHud(); renderLog(); renderSignal(); heroLoopGate(); }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);

  /* ======================================== pointer depth on the hero ===== */
  if (fine && !reduce) {
    var mx = 0, my = 0, tx = 0, ty = 0, running = false;
    var step = function () {
      mx += (tx - mx) * 0.07; my += (ty - my) * 0.07;
      root.style.setProperty('--mx', mx.toFixed(4));
      root.style.setProperty('--my', my.toFixed(4));
      if (Math.abs(tx - mx) > 0.0008 || Math.abs(ty - my) > 0.0008) requestAnimationFrame(step);
      else running = false;
    };
    addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: true });
  }

  /* ========================================= hero: living plate (video) === */
  var loop = $('.hero__loop');
  var loopReady = false;
  if (loop && !reduce) {
    var src = smallMQ.matches ? loop.getAttribute('data-src-mobile') : loop.getAttribute('data-src');
    loop.addEventListener('playing', function () { loop.classList.add('is-playing'); }, { once: true });
    loop.addEventListener('error', function () { loopReady = false; }, { once: true });
    loop.src = src; loopReady = true;
    var p = loop.play(); if (p && p.catch) p.catch(function () {});
  }
  function heroLoopGate() {
    if (!loopReady) return;
    var visible = A.hero.el.getBoundingClientRect().bottom > 0 && !document.hidden;
    if (visible && loop.paused) { var q = loop.play(); if (q && q.catch) q.catch(function () {}); }
    else if (!visible && !loop.paused) loop.pause();
  }
  document.addEventListener('visibilitychange', queue);
  // iOS can refuse the first play() (no user activation yet, Low Power Mode):
  // retry on the first real gesture as well as on scroll.
  ['touchend', 'pointerdown', 'click'].forEach(function (ev) {
    addEventListener(ev, heroLoopGate, { passive: true });
  });

  /* ======================================== particles: dust and bokeh ===== */
  function fitCanvas(c, maxDpr) {
    var dpr = Math.min(devicePixelRatio || 1, maxDpr);
    var w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    }
    return dpr;
  }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // Hero dust: motes drifting up through the lamp light.
  var dustC = $('.hero__dust');
  var dust = [];
  for (var d = 0; d < (smallMQ.matches ? 26 : 54); d++) {
    dust.push({ x: Math.random(), y: Math.random(), r: rand(0.6, 2.2), v: rand(0.00008, 0.00032), ph: rand(0, 6.28), sw: rand(0.2, 1) });
  }
  function drawDust(t) {
    var dpr = fitCanvas(dustC, 1.5), ctx = dustC.getContext('2d');
    var w = dustC.width, h = dustC.height;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < dust.length; i++) {
      var m = dust[i];
      if (!reduce) { m.y -= m.v * 16; if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); } }
      var x = (m.x + Math.sin(t * 0.0003 * m.sw + m.ph) * 0.012) * w;
      var y = m.y * h;
      // brighter near the lamp (right half), dim across the dark room
      var lamp = 0.25 + 0.75 * Math.max(0, 1 - Math.hypot(m.x - 0.72, m.y - 0.55) * 1.6);
      var a = (0.35 + 0.35 * Math.sin(t * 0.002 + m.ph)) * lamp;
      ctx.fillStyle = 'rgba(255,196,140,' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, m.r * dpr, 0, 6.2832); ctx.fill();
    }
  }

  // Ambient: slow bokeh behind every open section. Cold at the top of the
  // evening, warm once the room has filled.
  var amb = $('.ambient');
  var COLD = [[255, 60, 120], [70, 190, 255], [255, 138, 42]];
  var WARM = [[255, 138, 42], [255, 176, 90], [255, 70, 120]];
  var orbs = [];
  for (var o = 0; o < (smallMQ.matches ? 9 : 16); o++) {
    orbs.push({ x: Math.random(), y: Math.random(), r: rand(0.06, 0.2), vx: rand(-1, 1) * 0.00004, vy: rand(-1, 1) * 0.00003, c: o % 3, a: rand(0.05, 0.13), ph: rand(0, 6.28) });
  }
  var lastY = scrollY, vel = 0;
  function drawAmbient(t) {
    fitCanvas(amb, 1);
    var ctx = amb.getContext('2d'), w = amb.width, h = amb.height, s = Math.max(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    var warm = clamp01(A.peak.p * 1.4);
    vel += (Math.abs(scrollY - lastY) - vel) * 0.08; lastY = scrollY;
    var speed = 1 + Math.min(vel / 30, 2.5);
    for (var i = 0; i < orbs.length; i++) {
      var b = orbs[i];
      if (!reduce) {
        b.x += b.vx * 16 * speed; b.y += b.vy * 16 * speed;
        if (b.x < -0.2) b.x = 1.2; if (b.x > 1.2) b.x = -0.2;
        if (b.y < -0.2) b.y = 1.2; if (b.y > 1.2) b.y = -0.2;
      }
      var c0 = COLD[b.c], c1 = WARM[b.c];
      var r = Math.round(c0[0] + (c1[0] - c0[0]) * warm), g = Math.round(c0[1] + (c1[1] - c0[1]) * warm), bl = Math.round(c0[2] + (c1[2] - c0[2]) * warm);
      var al = b.a * (0.75 + 0.25 * Math.sin(t * 0.0006 + b.ph));
      var cx = b.x * w, cy = b.y * h, rad = b.r * s;
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + bl + ',' + al.toFixed(3) + ')');
      grad.addColorStop(0.45, 'rgba(' + r + ',' + g + ',' + bl + ',' + (al * 0.35).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + bl + ',0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  var lastAmb = 0;
  function particles(t) {
    if (!document.hidden) {
      if (A.hero.live) drawDust(t);
      // 30fps is plenty for something this slow
      if (t - lastAmb > 32) { drawAmbient(t); lastAmb = t; }
    }
    if (!reduce) requestAnimationFrame(particles);
  }
  if (reduce) { drawDust(0); drawAmbient(0); addEventListener('resize', function () { drawDust(0); drawAmbient(0); }); }
  else requestAnimationFrame(particles);

  /* ================================================= the live demo ======= */
  var EVENTS = [
    { id: 'thu', day: 'Чт', time: '19:30', title: 'Стендап. Открытый микрофон', taken: [1, 4, 7, 10, 12] },
    { id: 'fri', day: 'Пт', time: '20:00', title: 'Джазовый вечер', taken: [1, 2, 3, 4, 6, 8, 9, 10, 11] },
    { id: 'sat', day: 'Сб', time: '21:00', title: 'Караоке-баттл', taken: [2, 3, 5, 8, 9, 12] },
    { id: 'sun', day: 'Вс', time: '18:00', title: 'Квиз для компаний', taken: [1, 5, 6, 11] }
  ];
  var DAY_LONG = { 'Чт': 'в четверг', 'Пт': 'в пятницу', 'Сб': 'в субботу', 'Вс': 'в воскресенье' };
  var SIZE_CQ = { r: [6.9, 6.9, '50%'], R: [8.6, 8.6, '50%'], q: [9.6, 7.8], Q: [13, 7.8], b: [19, 5.6] };

  var st = { ev: EVENTS[1], pick: null, phase: 'idle', mine: {} };
  var evList = $('[data-events]'), room = $('[data-plan="demo"]'), form = $('[data-book]');
  var pickLine = $('[data-pick]'), seatsSel = $('[data-seats]'), goBtn = $('.book__go', form);
  var chat = $('[data-chat]'), adminLine = $('[data-admin]');

  EVENTS.forEach(function (ev) {
    var wrap = document.createElement('div'); wrap.className = 'ev';
    var id = 'ev-' + ev.id;
    wrap.innerHTML = '<input type="radio" name="event" id="' + id + '" value="' + ev.id + '"' + (ev === st.ev ? ' checked' : '') + '>' +
      '<label for="' + id + '"><span class="ev__day">' + ev.day + ' · ' + ev.time + '</span><span class="ev__title">' + ev.title + '</span></label>';
    evList.appendChild(wrap);
  });
  evList.addEventListener('change', function (e) {
    st.ev = EVENTS.filter(function (x) { return x.id === e.target.value; })[0];
    if (st.phase === 'pending') { st.phase = 'idle'; clearKeys(); }
    st.pick = null; renderFloor(); renderPick();
  });

  room.appendChild(planSVG({ labels: true }));
  var tbBtns = {};
  TABLES.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tb'; b.textContent = t.n;
    b.dataset.kind = t.k.toLowerCase();
    var sz = SIZE_CQ[t.k];
    b.style.left = t.x + '%'; b.style.top = t.y + '%';
    b.style.setProperty('--w', sz[0]); b.style.setProperty('--h', sz[1]);
    b.addEventListener('click', function () {
      if (b.disabled || st.phase === 'pending') return;
      st.pick = st.pick === t.n ? null : t.n;
      renderFloor(); renderPick();
      if (st.pick) $('input[name="guest"]', form).focus({ preventScroll: true });
    });
    room.appendChild(b); tbBtns[t.n] = b;
  });

  function mineKey(n) { return st.ev.id + ':' + n; }
  function renderFloor() {
    TABLES.forEach(function (t) {
      var b = tbBtns[t.n];
      var taken = st.ev.taken.indexOf(t.n) > -1;
      var mine = !!st.mine[mineKey(t.n)];
      var pick = st.pick === t.n;
      b.classList.toggle('is-taken', taken);
      b.classList.toggle('is-yours', mine);
      b.classList.toggle('is-pick', pick && !mine);
      b.classList.toggle('is-pending', pick && st.phase === 'pending');
      b.disabled = taken || mine;
      b.setAttribute('aria-pressed', pick ? 'true' : 'false');
      b.setAttribute('aria-label', 'Стол ' + t.n + ', мест: ' + t.seats + ', ' + (mine ? 'ваша бронь' : taken ? 'занят' : pick ? 'выбран' : 'свободен'));
    });
  }
  function renderPick() {
    pickLine.classList.remove('is-warn');
    var t = st.pick && TABLES[st.pick - 1];
    if (!t) {
      pickLine.innerHTML = 'Выберите свободный стол на&nbsp;схеме';
      seatsSel.innerHTML = '<option>2</option>'; seatsSel.disabled = true;
      goBtn.disabled = true; return;
    }
    pickLine.textContent = st.ev.title + ' · ' + st.ev.day + ', ' + st.ev.time + ' · стол ' + t.n;
    var cur = parseInt(seatsSel.value, 10) || 2;
    seatsSel.innerHTML = '';
    for (var i = 1; i <= t.seats; i++) {
      var o = document.createElement('option'); o.value = i; o.textContent = i;
      if (i === Math.min(cur, t.seats)) o.selected = true;
      seatsSel.appendChild(o);
    }
    seatsSel.disabled = false;
    goBtn.disabled = st.phase === 'pending';
  }

  function now() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bubble(html, who) {
    var m = document.createElement('div');
    m.className = 'msg msg--' + (who || 'bot');
    m.innerHTML = html + '<span class="msg__time">' + now() + '</span>';
    chat.appendChild(m); chat.scrollTop = chat.scrollHeight;
    return m;
  }
  function typing(ms, then) {
    var t = document.createElement('div'); t.className = 'typing'; t.setAttribute('aria-label', 'бот печатает');
    t.innerHTML = '<i></i><i></i><i></i>';
    chat.appendChild(t); chat.scrollTop = chat.scrollHeight;
    setTimeout(function () { t.remove(); then(); }, reduce ? 150 : ms);
  }
  function clearKeys() { $$('.keys', chat).forEach(function (k) { $$('button', k).forEach(function (b) { b.disabled = true; }); }); }

  bubble('Здравствуйте! Сюда придёт подтверждение, когда вы забронируете стол на&nbsp;сайте.');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nameIn = $('input[name="guest"]', form);
    var name = nameIn.value.trim();
    if (!st.pick) { pickLine.classList.add('is-warn'); pickLine.textContent = 'Сначала выберите свободный стол на схеме'; return; }
    if (!name) { nameIn.setAttribute('aria-invalid', 'true'); pickLine.classList.add('is-warn'); pickLine.textContent = 'Как к вам обращаться? Введите имя'; nameIn.focus(); return; }
    nameIn.removeAttribute('aria-invalid');
    var t = TABLES[st.pick - 1], ev = st.ev, seats = seatsSel.value;
    st.phase = 'pending'; goBtn.disabled = true; renderFloor();
    typing(900, function () {
      bubble('<b>' + esc(name) + ', почти готово!</b><span class="msg__mono">' + esc(ev.title) + '<br>' + ev.day + ', ' + ev.time + ' · стол ' + t.n + ' · гостей: ' + seats + '</span>Подтвердите, что придёте:');
      var keys = document.createElement('div'); keys.className = 'keys';
      keys.innerHTML = '<button class="key" type="button" data-k="yes">Подтверждаю</button><button class="key" type="button" data-k="no">Отменить</button>';
      chat.appendChild(keys); chat.scrollTop = chat.scrollHeight;
      keys.addEventListener('click', function (ke) {
        var k = ke.target.getAttribute('data-k'); if (!k) return;
        $$('button', keys).forEach(function (b) { b.disabled = true; });
        if (k === 'yes') {
          bubble('Подтверждаю', 'me');
          typing(700, function () {
            bubble('Бронь подтверждена. Стол ' + t.n + ' ждёт вас ' + DAY_LONG[ev.day] + ' в ' + ev.time + '. До встречи!');
            st.mine[ev.id + ':' + t.n] = true; st.phase = 'idle'; st.pick = null;
            adminLine.textContent = 'Администратору: новая бронь · ' + ev.day + ' ' + ev.time + ' · стол ' + t.n + ' · ' + name;
            renderFloor(); renderPick();
            pickLine.textContent = 'Готово. Стол ' + t.n + ' за вами. Можно выбрать другой вечер.';
          });
        } else {
          bubble('Отменить', 'me');
          typing(600, function () {
            bubble('Бронь отменена, стол ' + t.n + ' снова свободен.');
            st.phase = 'idle'; renderFloor(); renderPick();
          });
        }
      });
    });
  });
  $('input[name="guest"]', form).addEventListener('input', function (e) { e.target.removeAttribute('aria-invalid'); });
  renderFloor(); renderPick();

  /* =================================================== the lead form ===== */
  var lead = $('[data-lead]'), statusEl = $('[data-status]', lead);
  function setErr(name, msg) {
    var input = lead.elements[name], err = $('[data-err="' + name + '"]', lead);
    err.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !msg;
  }
  lead.addEventListener('input', function (e) { if (e.target.name) setErr(e.target.name, ''); });
  lead.addEventListener('submit', function (e) {
    e.preventDefault();
    statusEl.className = 'lead__status'; statusEl.textContent = '';
    var data = { name: lead.elements.name.value.trim(), venue: lead.elements.venue.value.trim(), whatsapp: lead.elements.whatsapp.value.trim() };
    var digits = data.whatsapp.replace(/\D/g, '');
    var ok = setErr('name', data.name.length < 2 ? 'Напишите, как к вам обращаться' : '');
    ok = setErr('venue', data.venue.length < 2 ? 'Как называется заведение?' : '') && ok;
    ok = setErr('whatsapp', digits.length < 10 || digits.length > 15 ? 'Номер целиком, с кодом страны' : '') && ok;
    if (!ok) { var bad = $('[aria-invalid="true"]', lead); if (bad) bad.focus(); return; }

    var btn = $('.lead__go', lead);
    if (!CONFIG.leadEndpoint) {
      statusEl.classList.add('is-warn');
      statusEl.textContent = 'Заявка не отправлена: приёмник заявок ещё не подключён к этой сборке сайта.';
      return;
    }
    btn.disabled = true; btn.textContent = 'Отправляем…';
    fetch(CONFIG.leadEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); })
      .then(function () {
        statusEl.classList.add('is-ok');
        statusEl.textContent = 'Заявка у нас. Напишем в WhatsApp на ' + data.whatsapp + '.';
        lead.reset();
        var last = $('.pt[data-t="12"]', closePlan);
        last.classList.remove('is-yours'); last.classList.add('is-arrived');
      })
      .catch(function () {
        statusEl.classList.add('is-warn');
        statusEl.textContent = 'Не получилось отправить. Попробуйте ещё раз через минуту.';
      })
      .then(function () { btn.disabled = false; btn.textContent = 'Хочу такой сайт'; });
  });

  queue();
})();
