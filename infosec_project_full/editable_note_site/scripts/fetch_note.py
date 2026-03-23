from pathlib import Path
from urllib.request import urlopen

NOTE_URL = 'https://raw.githubusercontent.com/sqc-cyh/sqc-cyh.github.io/main/docs/LessonsNotes/D2CX_Xinanyuan/note.md'
OUT = Path(__file__).resolve().parent.parent / 'content' / 'note.md'

OUT.parent.mkdir(parents=True, exist_ok=True)
with urlopen(NOTE_URL) as r:
    OUT.write_bytes(r.read())
print(f'Saved note to: {OUT}')
