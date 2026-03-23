import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
for script in ['fetch_note.py', 'fetch_assets.py']:
    subprocess.check_call([sys.executable, str(root / script)])
