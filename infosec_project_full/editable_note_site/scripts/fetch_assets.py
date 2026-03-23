from pathlib import Path
from urllib.request import urlopen

BASE = 'https://raw.githubusercontent.com/sqc-cyh/sqc-cyh.github.io/main/docs/LessonsNotes/D2CX_Xinanyuan/img/'
OUT_DIR = Path(__file__).resolve().parent.parent / 'content' / 'img'
OUT_DIR.mkdir(parents=True, exist_ok=True)

for i in range(1, 59):
    url = f'{BASE}{i}.png'
    target = OUT_DIR / f'{i}.png'
    try:
        with urlopen(url) as r:
            target.write_bytes(r.read())
        print('saved', target.name)
    except Exception as e:
        print('failed', url, e)
