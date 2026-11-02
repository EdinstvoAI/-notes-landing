// size the 1920px design to the layout width (without the scrollbar)
const rem = () => document.documentElement.clientWidth / 1920;
const fit = () => { document.documentElement.style.fontSize = rem() + 'px'; };
fit();
addEventListener('resize', fit);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// "место для ..." word cycle
const words = ['мыслей', 'идей', 'планов', 'хаоса', 'дедлайнов', 'списков покупок', 'паролей от wifi',
  'мыслей в 3 ночи', 'гениальных идей', '«потом разберусь»', 'всего, что в голове'];
const word = document.querySelector('.js-word');
let wi = 0;
setInterval(() => {
  if (reduced) return;
  word.classList.add('is-out');
  setTimeout(() => {
    wi = (wi + 1) % words.length;
    word.textContent = words[wi];
    word.classList.replace('is-out', 'is-in');
    word.offsetHeight;
    word.classList.remove('is-in');
  }, 700);
}, 2200);

// text running around the hero rectangle
const loop = document.getElementById('loop');
const pathLen = loop.getTotalLength();
const paths = [...document.querySelectorAll('.js-path')];
// one phrase; the second copy trails by a full lap so the wrap-around is seamless
let pathOffset = 0;

// lead words revealed by scroll
const lead = document.querySelector('.js-lead');
lead.innerHTML = lead.textContent.split(' ')
  .map(w => `<span class="w">${w.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`).join(' ');
const leadWords = [...lead.querySelectorAll('.w')];
const story = document.querySelector('.story');
const app = document.querySelector('.js-app');

function onScroll() {
  const r = rem();
  const scrolled = -story.getBoundingClientRect().top;
  const range = 1400 * r;
  // 0..0.55 reveal lead, 0.6..0.8 swap lead -> app
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
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();

// curved, always-spinning carousel
const carousel = document.querySelector('.js-carousel');
const originals = [...carousel.children];
for (let k = 0; k < 2; k++) originals.forEach(c => carousel.appendChild(c.cloneNode(true)));
const cards = [...carousel.children];
const STEP = 469.6;            // card + gap, design px
const SPEED = 45;              // design px per second
const total = cards.length * STEP;
const START = -439;            // first card x in the frame
let shift = 0, last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const r = rem();
  if (!reduced) {
    shift = (shift + SPEED * dt) % total;
    pathOffset = (pathOffset + 60 * dt) % pathLen;
  }
  paths[0].setAttribute('startOffset', pathOffset);
  paths[1].setAttribute('startOffset', pathOffset - pathLen);

  for (let i = 0; i < cards.length; i++) {
    let x = ((i * STEP - shift) % total + total) % total + START - STEP;
    if (x > 1920 + STEP) x -= total;
    const d = (x + 224.8 - 960) / 960;          // -1 left edge .. 1 right edge
    const ang = -d * 32;
    const z = Math.abs(d) * Math.abs(d) * 220;
    cards[i].style.transform = `translateX(${x * r}px) translateZ(${z * r}px) rotateY(${ang}deg)`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
