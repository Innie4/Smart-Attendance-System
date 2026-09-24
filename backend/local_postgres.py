"""Manages the local embedded PostgreSQL server (fixed port 5432).

Uses the Postgres binaries bundled with the `pgserver` pip package.
Data lives in <repo>/.pgdata (gitignored) and persists across restarts.

Usage:
  python backend/local_postgres.py start   # init (first run) + start
  python backend/local_postgres.py stop    # stop
  python backend/local_postgres.py status  # check
"""

import os
import re
import subprocess
import sys

import pgserver._commands as pgcmd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PGDATA = os.path.join(ROOT, ".pgdata")
PORT = int(os.environ.get("LOCAL_PG_PORT", "5432"))
BIN = pgcmd.POSTGRES_BIN_PATH


def run_bin(name, *args):
    exe = os.path.join(BIN, name + ".exe")
    return subprocess.run([exe, *args], capture_output=True, text=True)


def ensure_conf():
    conf = os.path.join(PGDATA, "postgresql.conf")
    text = open(conf).read()
    text = re.sub(r"^#?port\s*=.*$", f"port = {PORT}", text, flags=re.M)
    if f"port = {PORT}" not in text:
        text += f"\nport = {PORT}\n"
    if "listen_addresses" not in text:
        text += "\nlisten_addresses = 'localhost'\n"
    open(conf, "w").write(text)


def is_running():
    r = run_bin("pg_ctl", "-D", PGDATA, "status")
    return r.returncode == 0


def start():
    if not os.path.exists(os.path.join(PGDATA, "PG_VERSION")):
        print("Initializing new cluster in .pgdata ...")
        r = run_bin("initdb", "-D", PGDATA, "-E", "UTF8")
        if r.returncode != 0:
            print(r.stdout, r.stderr)
            sys.exit(1)
    ensure_conf()
    if is_running():
        print("Postgres already running on port", PORT)
        return
    log = os.path.join(PGDATA, "server.log")
    r = run_bin("pg_ctl", "-D", PGDATA, "-l", log, "-w", "start")
    print(r.stdout, r.stderr)
    if r.returncode != 0:
        sys.exit(1)
    print(f"Postgres started on localhost:{PORT}")


def stop():
    r = run_bin("pg_ctl", "-D", PGDATA, "-w", "stop")
    print(r.stdout, r.stderr)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "start"
    if cmd == "start":
        start()
    elif cmd == "stop":
        stop()
    elif cmd == "status":
        print("running" if is_running() else "stopped")
        sys.exit(0 if is_running() else 1)
    else:
        sys.exit(f"unknown command: {cmd}")
