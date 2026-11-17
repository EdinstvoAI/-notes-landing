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
  const copies = Math.max(4, Math.ceil(root.clientWidth / Math.max(1, item.offsetWidth)) * 2 + 2);
  for (let i = 1; i < copies; i++) track.append(item.cloneNode(true));
  track.style.animationDuration = `${copies * 5}s`;
}

$$('.nav__links a').forEach((a, i) => { if (t.nav[i]) a.textContent = t.nav[i]; });
$$('.js-path').forEach(p => { p.textContent = t.path; });
$('.js-place').textContent = t.place;
const lead = $('.js-lead');
const leadWords = t.lead.split(/\s+/).map(text => {
  const word = document.createElement('span');
  word.textContent = text;
  return word;
});
lead.replaceChildren(...leadWords.flatMap((word, index) => index ? [' ', word] : [word]));
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
  queueScroll();
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

const mcp = $('.mcp-feature');
const voice = $('.voice-feature');
const reveal = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    reveal.unobserve(entry.target);
  });
}, { threshold: .25 });
[voice, $('.mini-features')].forEach(el => reveal.observe(el));
if (!reduced) $('.mini-features').classList.add('will-reveal');

const search = $('.search-feature');
const query = $('.js-search-query');
const status = $('.js-search-status');
const result = $('.search-result');
const searchIntro = $('.search-intro');
const sheet = $('.sheet');
const vaultIntro = $('.vault-intro');
const nav = $('.nav');
const navSections = [
  [$('.hero'), 'hero'], [sheet, 'light'], [voice, 'dark'],
  [searchIntro, 'light'], [$('.search-copy'), 'orange'],
  [$('.vault-feature'), 'orange'], [mcp, 'dark'],
  [$('.history-feature'), 'light'], [$('.extras'), 'dark'],
  [$('.docs'), 'dark'], [$('.bottom'), 'dark'], [$('.footer'), 'light'],
];
const clamp = value => Math.min(1, Math.max(0, value));
const progress = element => {
  const rect = element.getBoundingClientRect();
  const frameHeight = element.firstElementChild.offsetHeight;
  return clamp(-rect.top / Math.max(1, rect.height - frameHeight));
};

let scrollFrame = 0;
function onScroll() {
  scrollFrame = 0;
  root.classList.toggle('is-stuck', scrollY >= (mobile() ? 40 : 61) * scale() - 1);
  const whiteProgress = progress(sheet);
  const searchProgress = reduced ? 1 : progress(searchIntro);
  const vaultProgress = progress(vaultIntro);
  if (!reduced) {
    const radius = (mobile() ? 34 : 50) * scale();
    for (const scene of [sheet, searchIntro]) {
      const bounds = scene.getBoundingClientRect();
      const exit = scene.firstElementChild.getBoundingClientRect().height - bounds.bottom;
      scene.style.setProperty('--top-radius', `${radius * clamp(1 + bounds.top / radius)}px`);
      scene.style.setProperty('--bottom-radius', `${radius * clamp(exit / radius)}px`);
    }
  }
  sheet.style.setProperty('--lead-in', reduced ? 1 : clamp((whiteProgress - .04) / .16));
  const inkProgress = reduced ? 1 : clamp((whiteProgress - .22) / .68);
  leadWords.forEach((word, index) => {
    word.classList.toggle('is-read', inkProgress * leadWords.length >= index + 1);
  });
  vaultIntro.style.setProperty('--vault-in', reduced ? 1 : clamp((vaultProgress - .12) / .26));
  vaultIntro.style.setProperty('--vanish', reduced ? 0 : clamp((vaultProgress - .58) / .35));
  vaultIntro.classList.toggle('is-orbiting', vaultIntro.getBoundingClientRect().bottom > 0 &&
    vaultIntro.getBoundingClientRect().top < innerHeight && vaultProgress < .93);

  const text = 'что решили про запуск?';
  const length = Math.floor(clamp((searchProgress - .28) / .35) * text.length);
  search.classList.toggle('is-active', searchProgress >= .25);
  query.textContent = text.slice(0, length);
  status.textContent = searchProgress >= .78 ? 'найдено 1 совпадение' :
    length === text.length ? 'ищем по смыслу…' : 'введите запрос';
  result.classList.toggle('is-found', searchProgress >= .78);

  const navLinks = nav.querySelector('.nav__links').getBoundingClientRect();
  const navLine = navLinks.top + navLinks.height / 2;
  let tone = 'hero';
  for (const [section, color] of navSections) {
    if (section.getBoundingClientRect().top <= navLine) tone = color;
  }
  nav.dataset.tone = tone;
}

function queueScroll() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(onScroll);
}

addEventListener('scroll', queueScroll, { passive: true });
addEventListener('resize', measure);
document.fonts.ready.then(measure);
measure();
requestAnimationFrame(animate);
