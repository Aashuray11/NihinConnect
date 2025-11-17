#!/usr/bin/env python3
import sqlite3
import json
import sys
from pathlib import Path

def main(email):
    db_path = Path(__file__).resolve().parents[1] / 'db.sqlite3'
    if not db_path.exists():
        print(json.dumps({'error': f'db not found at {db_path}'}))
        return
    conn = sqlite3.connect(str(db_path))
    c = conn.cursor()
    # find user id
    c.execute("SELECT id FROM users_customuser WHERE email = ?", (email,))
    r = c.fetchone()
    if not r:
        print(json.dumps({'code': None, 'error': 'user not found'}))
        return
    uid = r[0]
    c.execute("SELECT code, created_at, used, expires_at FROM users_otp WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", (uid,))
    r = c.fetchone()
    if not r:
        print(json.dumps({'code': None}))
        return
    code, created_at, used, expires_at = r
    out = {'code': code, 'created_at': created_at, 'used': bool(used), 'expires_at': expires_at}
    print(json.dumps(out))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'email argument required'}))
        sys.exit(1)
    main(sys.argv[1])
