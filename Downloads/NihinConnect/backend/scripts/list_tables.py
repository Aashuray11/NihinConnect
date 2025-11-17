import sqlite3
from pathlib import Path

DB = Path(__file__).resolve().parents[1] / 'db.sqlite3'
conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = sorted(r[0] for r in cur.fetchall())
print('\n'.join(tables))
