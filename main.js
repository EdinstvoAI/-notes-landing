const root = document.documentElement;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const mobile = () => root.clientWidth < 768;
const base = () => mobile() ? 430 : 1920;
const scale = () => root.clientWidth / base();
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const langs = Object.keys(I18N);
const legacy = new URLSearchParams(location.search).get('lang');
if (langs.includes(legacy)) location.replace(new URL(legacy === 'ru' ? '/' : `/${legacy}/`, location.href));
const lang = langs.includes(root.lang) ? root.lang : 'ru';
const t = I18N[lang];
document.title = t.title;

const track = $('.ticker__track');
function fillTicker() {
  track.replaceChildren();
  const item = document.createElement('span');
  item.textContent = t.ticker;
  track.append(item);
  const copies = Math.max(4, Math.ceil(root.clientWidth / item.offsetWidth) * 2 + 2);
  for (let i = 1; i < copies; i++) track.append(item.cloneNode(true));
  track.style.animationDuration = `${copies * 5}s`;
}

$$('.nav__links a').forEach((a, i) => { if (t.nav[i]) a.textContent = t.nav[i]; });
$$('.js-path').forEach(p => { p.textContent = t.path; });
$('.js-place').textContent = t.place;
$('.js-lead').textContent = t.lead;
$$('.footer__col--map > *').forEach((el, i) => { if (t.map[i]) el.textContent = t.map[i]; });
$$('.footer__col--res > *').forEach((el, i) => { if (t.res[i]) el.textContent = t.res[i]; });
$$('.footer__langs a').forEach(a => a.classList.toggle('is-active', a.dataset.lang === lang));

const wordBox = $('.hero__word');
let word = $('.js-word');
let wordIndex = 0;
const words = t.words;
setInterval(() => {
  if (reduced || document.hidden) return;
  const old = word;
  old.classList.add('is-out');
  word = document.createElement('span');
  word.className = 'js-word is-in';
  word.textContent = words[++wordIndex % words.length];
  wordBox.append(word);
  word.offsetHeight;
  word.classList.remove('is-in');
  setTimeout(() => old.remove(), 900);
}, 2400);

const hero = $('.hero');
const svg = $('.hero__path');
const loop = $('#loop');
const paths = $$('.js-path');
let pathLength = 1;
let pathOffset = 0;
function measure() {
  const r = scale();
  root.style.fontSize = `${r}px`;
  const w = hero.clientWidth / r;
  const h = hero.clientHeight / r;
  const [x, y, x2, y2, radius] = mobile() ? [14, 104, w - 14, h - 24, 34] : [55, 176, 1865, 306, 62];
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  loop.setAttribute('d', `M${x + radius} ${y}H${x2 - radius}A${radius} ${radius} 0 0 1 ${x2} ${y + radius}V${y2 - radius}A${radius} ${radius} 0 0 1 ${x2 - radius} ${y2}H${x + radius}A${radius} ${radius} 0 0 1 ${x} ${y2 - radius}V${y + radius}A${radius} ${radius} 0 0 1 ${x + radius} ${y}Z`);
  pathLength = loop.getTotalLength();
  fillTicker();
}

let visibleHero = true;
new IntersectionObserver(([entry]) => { visibleHero = entry.isIntersecting; }).observe(hero);
let last = performance.now();
function animate(now) {
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  if (visibleHero && !reduced) {
    pathOffset = (pathOffset + (mobile() ? 36 : 58) * dt) % pathLength;
    paths[0].setAttribute('startOffset', pathOffset);
    paths[1].setAttribute('startOffset', pathOffset - pathLength);
  }
  requestAnimationFrame(animate);
}

const calendar = $('.calendar');
const mcp = $('.mcp-feature');
const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  entry.target.classList.toggle('is-visible', entry.isIntersecting);
}), { threshold: .35 });
[calendar, mcp].forEach(el => observer.observe(el));

const search = $('.search-feature');
const query = $('.js-search-query');
const status = $('.js-search-status');
const result = $('.search-result');
let searchPlayed = false;
new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting || searchPlayed) return;
  searchPlayed = true;
  setTimeout(() => {
    search.classList.add('is-active');
    const text = 'что решили про запуск?';
    let i = 0;
    const typing = setInterval(() => {
      query.textContent = text.slice(0, ++i);
      if (i === text.length) {
        clearInterval(typing);
        status.textContent = 'ищем по смыслу…';
        setTimeout(() => { status.textContent = 'найдено 1 совпадение'; result.classList.add('is-found'); }, 650);
      }
    }, reduced ? 0 : 50);
  }, reduced ? 0 : 450);
}, { threshold: .45 }).observe(search);

function onScroll() { root.classList.toggle('is-stuck', scrollY >= (mobile() ? 40 : 61) * scale() - 1); }
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', measure);
document.fonts.ready.then(measure);
measure();
onScroll();
requestAnimationFrame(animate);
