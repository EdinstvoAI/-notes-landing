const root = document.documentElement;
const MOBILE_MAX = 768;
const isMobile = () => root.clientWidth < MOBILE_MAX;
// 1rem = 1px of the Figma frame: 1920 wide on desktop, 430 wide on mobile
const base = () => (isMobile() ? 430 : 1920);
const rem = () => root.clientWidth / base();
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// curved carousel: clone the set so the loop never shows a gap
const carousel = $('.js-carousel');
const originals = [...carousel.children];
for (let k = 0; k < 2; k++) originals.forEach(c => carousel.appendChild(c.cloneNode(true)));
const cards = [...carousel.children];

// language
const langs = Object.keys(I18N);
let lang = new URLSearchParams(location.search).get('lang');
if (!langs.includes(lang)) {
  try { lang = localStorage.getItem('lang'); } catch {}
}
if (!langs.includes(lang)) lang = (navigator.language || 'ru').slice(0, 2);
if (!langs.includes(lang)) lang = 'en';

const lead = $('.js-lead');
let leadWords = [];
let words = [];

function applyLang(next) {
  lang = next;
  const t = I18N[lang];
  root.lang = lang;
  document.title = t.title;
  fillTicker(t.ticker);
  $$('.nav__links a').forEach((a, i) => (a.textContent = t.nav[i]));
  $$('.js-path').forEach(p => (p.textContent = t.path));
  $('.js-place').textContent = t.place;
  words = t.words;
  wi = 0;
  word.textContent = words[0];
  lead.innerHTML = t.lead.split(' ')
    .map(w => `<span class="w">${w.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`).join(' ');
  leadWords = [...lead.querySelectorAll('.w')];
  $('.app__title').textContent = t.tagline;
  cards.forEach((c, i) => {
    const [h, p] = t.cards[i % t.cards.length];
    c.querySelector('h3').textContent = h;
    c.querySelector('p').textContent = p;
  });
  $('.wip').textContent = t.wip;
  $$('.footer__col--map > *').forEach((el, i) => (el.textContent = t.map[i]));
  $$('.footer__col--res > *').forEach((el, i) => (el.textContent = t.res[i]));
  $$('.footer__langs a').forEach(a => a.classList.toggle('is-active', a.dataset.lang === lang));
  measurePath();
  onScroll();
}

$$('.footer__langs a').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  try { localStorage.setItem('lang', a.dataset.lang); } catch {}
  history.replaceState(null, '', `?lang=${a.dataset.lang}`);
  applyLang(a.dataset.lang);
}));

// ticker: two identical halves, each wider than the screen, so -50% loops seamlessly
const track = $('.ticker__track');
let tickerText = '';
function fillTicker(text = tickerText) {
  tickerText = text;
  track.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = text;
  track.appendChild(span);
  const n = Math.max(1, Math.ceil(root.clientWidth / span.offsetWidth) + 1);
  for (let i = 1; i < n * 2; i++) track.appendChild(span.cloneNode(true));
  track.style.animationDuration = `${n * 9}s`;
}

// "место для ..." word cycle: old word drifts up into blur while the next one rises in
const wordBox = $('.hero__word');
let word = $('.js-word');
let wi = 0;
setInterval(() => {
  if (reduced || document.hidden) return;
  wi = (wi + 1) % words.length;
  const old = word;
  old.classList.add('is-out');
  setTimeout(() => old.remove(), 900);
  word = document.createElement('span');
  word.className = 'js-word is-in';
  word.textContent = words[wi];
  wordBox.appendChild(word);
  word.offsetHeight;
  word.classList.remove('is-in');
}, 2400);

// one phrase running around the hero contour; the second copy trails by a full lap
const hero = $('.hero');
const svg = $('.hero__path');
const loop = $('#loop');
const paths = $$('.js-path');
let pathLen = 1;
let pathOffset = 0;

function measurePath() {
  const r = rem();
  const w = hero.clientWidth / r;
  const h = hero.clientHeight / r;
  // desktop rectangle comes from the Figma frame, mobile one hugs the card
  const [x, y, x2, y2, rad] = isMobile() ? [14, 86, w - 14, h - 24, 34] : [55, 176, 1865, 306, 62];
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  loop.setAttribute('d',
    `M${x + rad} ${y} H${x2 - rad} A${rad} ${rad} 0 0 1 ${x2} ${y + rad} V${y2 - rad} ` +
    `A${rad} ${rad} 0 0 1 ${x2 - rad} ${y2} H${x + rad} A${rad} ${rad} 0 0 1 ${x} ${y2 - rad} ` +
    `V${y + rad} A${rad} ${rad} 0 0 1 ${x + rad} ${y} Z`);
  pathLen = loop.getTotalLength();
}

// lead words revealed by scroll, then swapped for the app block
const story = $('.story');
const app = $('.js-app');

function onScroll() {
  const r = rem();
  root.classList.toggle('is-stuck', scrollY >= (isMobile() ? 40 : 61) * r - 1);
  const scrolled = -story.getBoundingClientRect().top;
  const range = (isMobile() ? 900 : 1400) * r;
  const reveal = clamp((scrolled + innerHeight * 0.5) / (range * 0.55 + innerHeight * 0.5));
  leadWords.forEach((w, i) => { w.style.opacity = 0.12 + 0.88 * clamp(reveal * leadWords.length - i); });
  const swap = clamp((scrolled / range - 0.6) / 0.2);
  lead.style.opacity = 1 - swap;
  lead.style.transform = `translateY(${-80 * swap * r}px)`;
  lead.style.filter = `blur(${swap * 12 * r}px)`;
  app.style.opacity = swap;
  app.style.transform = `translateY(${(1 - swap) * 120 * r}px)`;
  app.style.filter = `blur(${(1 - swap) * 12 * r}px)`;
  app.style.pointerEvents = swap > 0.5 ? 'auto' : 'none';
}

function fit() {
  root.style.fontSize = rem() + 'px';
  if (tickerText) fillTicker();
  measurePath();
  onScroll();
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', fit);

// carousel motion: constant drift + drag with inertia
const SPEED = 45;              // drift, design px per second
let shift = 0;
let velocity = 0;              // extra px/s from a throw
let dragging = false;
let dragX = 0, lastMoveX = 0, lastMoveT = 0;

carousel.addEventListener('pointerdown', e => {
  dragging = true;
  velocity = 0;
  dragX = lastMoveX = e.clientX;
  lastMoveT = performance.now();
  carousel.setPointerCapture(e.pointerId);
  carousel.classList.add('is-dragging');
});
carousel.addEventListener('pointermove', e => {
  if (!dragging) return;
  const now = performance.now();
  const dx = (e.clientX - dragX) / rem();
  shift -= dx;
  dragX = e.clientX;
  const dt = Math.max(1, now - lastMoveT) / 1000;
  velocity = -((e.clientX - lastMoveX) / rem()) / dt;
  lastMoveX = e.clientX;
  lastMoveT = now;
});
const release = () => {
  if (!dragging) return;
  dragging = false;
  carousel.classList.remove('is-dragging');
  if (performance.now() - lastMoveT > 80) velocity = 0;
};
carousel.addEventListener('pointerup', release);
carousel.addEventListener('pointercancel', release);
carousel.addEventListener('dragstart', e => e.preventDefault());

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const r = rem();
  const mobile = isMobile();
  const W = base();
  const scale = mobile ? 0.7 : 1;
  const step = 469.6 * scale;
  const total = cards.length * step;

  if (!dragging) {
    shift += ((reduced ? 0 : SPEED) + velocity) * dt;
    velocity *= Math.pow(0.04, dt);          // friction
    if (Math.abs(velocity) < 1) velocity = 0;
  }
  shift = ((shift % total) + total) % total;
  if (!reduced) pathOffset = (pathOffset + (mobile ? 40 : 60) * dt) % pathLen;
  paths[0].setAttribute('startOffset', pathOffset);
  paths[1].setAttribute('startOffset', pathOffset - pathLen);

  const half = 449.6 * scale / 2;
  for (let i = 0; i < cards.length; i++) {
    let x = ((i * step - shift) % total + total) % total - step * 2;
    const d = (x + half - W / 2) / (W / 2);   // -1 left edge .. 1 right edge
    const ang = -d * (mobile ? 16 : 32);
    const z = d * d * (mobile ? 50 : 220);
    cards[i].style.transform =
      `translateX(${x * r}px) translateZ(${z * r}px) rotateY(${ang}deg) scale(${scale})`;
  }
  requestAnimationFrame(frame);
}

fit();
applyLang(lang);
requestAnimationFrame(frame);
document.fonts.ready.then(() => { fillTicker(); measurePath(); });
