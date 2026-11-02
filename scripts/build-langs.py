"""Generate /en/ and /sr/ pages from index.html (the RU source).

Link previews (Telegram, VK, social) don't run JS, so each language needs
its own static <head>. Body text is translated at runtime by i18n.js.
Run after any change to index.html:  python3 scripts/build-langs.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://notes.makark.ru'

LANGS = {
    'en': {
        'locale': 'en_US',
        'title': '<notes> — Markdown notes, voice dictation and tasks',
        'desc': 'A notes app that doesn’t get in the way of thinking: markdown files in your folder, voice dictation, tasks in your calendar, smart search.',
        'alt': '<notes> — a place for thoughts',
    },
    'sr': {
        'locale': 'sr_RS',
        'title': '<notes> — Markdown белешке, диктирање гласом и задаци',
        'desc': 'Апликација за белешке која не омета размишљање: markdown фајлови у вашој фасцикли, диктирање гласом, задаци у календару, паметна претрага.',
        'alt': '<notes> — место за мисли',
    },
}


def esc(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def sub(pattern, repl, html):
    out, n = re.subn(pattern, lambda _: repl, html, count=1)
    if not n:
        raise SystemExit(f'pattern not found: {pattern}')
    return out


source = (ROOT / 'index.html').read_text(encoding='utf-8')

for code, t in LANGS.items():
    url = f'{SITE}/{code}/'
    html = source
    html = sub(r'<html lang="ru">', f'<html lang="{code}">', html)
    html = sub(r'<title>.*?</title>', f'<title>{esc(t["title"])}</title>', html)
    html = sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(t["desc"])}">', html)
    html = sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">', html)
    html = sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">', html)
    html = sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{esc(t["title"])}">', html)
    html = sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{esc(t["desc"])}">', html)
    html = sub(r'og-ru\.png', f'og-{code}.png', html)
    html = sub(r'<meta property="og:image:alt" content="[^"]*">', f'<meta property="og:image:alt" content="{esc(t["alt"])}">', html)
    others = [l for l in ('ru_RU', 'en_US', 'sr_RS') if l != t['locale']]
    html = re.sub(r'<meta property="og:locale" content="[^"]*">\s*<meta property="og:locale:alternate" content="[^"]*">\s*<meta property="og:locale:alternate" content="[^"]*">',
                  f'<meta property="og:locale" content="{t["locale"]}">\n  '
                  f'<meta property="og:locale:alternate" content="{others[0]}">\n  '
                  f'<meta property="og:locale:alternate" content="{others[1]}">', html, count=1)
    # assets live one level up
    html = re.sub(r'(src|href)="(assets/|styles\.css|i18n\.js|main\.js)', r'\1="../\2', html)
    out = ROOT / code / 'index.html'
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding='utf-8')
    print('wrote', out.relative_to(ROOT))
