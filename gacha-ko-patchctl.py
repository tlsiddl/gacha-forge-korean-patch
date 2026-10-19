#!/usr/bin/env python3
"""Install/upgrade/remove Gacha Forge Korean runtime patch without touching other hooks."""
import argparse
import hashlib
import pathlib
import re
import shutil
import subprocess

ROOT = pathlib.Path('/root/Marinara-Engine')
OVERRIDE = ROOT / 'docker-compose.override.yml'
TARGET = ROOT / 'gacha-ko-runtime.cjs'
SRC = pathlib.Path(__file__).resolve().with_name('gacha-ko-runtime.cjs')
OLD_MOUNT = './gacha-bg-runtime.cjs:/app/gacha-bg-runtime.cjs:ro'
NEW_MOUNT = './gacha-ko-runtime.cjs:/app/gacha-ko-runtime.cjs:ro'
OLD_REQUIRE = '--require=/app/gacha-bg-runtime.cjs'
NEW_REQUIRE = '--require=/app/gacha-ko-runtime.cjs'
STATE = ROOT / '.gacha-ko-patch-state'

def digest(b): return hashlib.sha256(b).hexdigest()
def stop(message): raise SystemExit('STOP: ' + message)
def state_of(s):
    old = OLD_MOUNT in s or OLD_REQUIRE in s
    new = NEW_MOUNT in s or NEW_REQUIRE in s
    return old, new

def patch(s):
    old, new = state_of(s)
    if (OLD_MOUNT in s) != (OLD_REQUIRE in s): stop('incomplete v1 setup; inspect override manually')
    if (NEW_MOUNT in s) != (NEW_REQUIRE in s): stop('incomplete v2 setup; inspect override manually')
    if new and not old: return s, 'already-v2'
    if new and old: stop('both v1 and v2 present; inspect override manually')
    if old:
        s = re.sub(r'(?m)^\s*-\s*' + re.escape(OLD_MOUNT) + r'\s*\n', '\n', s)
        s = s.replace(OLD_REQUIRE, '')
    if not s.strip(): s = 'services:\n  marinara:\n'
    if not re.search(r'(?m)^services:\s*$', s): stop('override YAML has no top-level services: section')
    if not re.search(r'(?m)^  marinara:\s*$', s):
        s = s.rstrip() + '\n  marinara:\n'
    head = re.search(r'(?m)^  marinara:\s*$', s)
    start = head.end()
    remaining = s[start:]
    next_service = re.search(r'(?m)^  [\w-]+:\s*$', remaining)
    end = start + next_service.start() if next_service else len(s)
    body = s[start:end]
    mount = '      - ' + NEW_MOUNT + '\n'
    volumes = re.search(r'(?m)^    volumes:\s*$', body)
    if volumes:
        ins = volumes.end()
        body = body[:ins] + '\n' + mount.rstrip('\n') + body[ins:]
    else:
        body = '\n    volumes:\n' + mount + body.lstrip('\n')
    env = re.search(r'(?m)^    environment:\s*$', body)
    opt = re.search(r'(?m)^(\s*)NODE_OPTIONS:\s*(["\'])(.*?)\2\s*$', body)
    if opt:
        value = ' '.join((opt.group(3) + ' ' + NEW_REQUIRE).split())
        body = body[:opt.start()] + opt.group(1) + 'NODE_OPTIONS: "' + value + '"' + body[opt.end():]
    elif env:
        pos = env.end()
        body = body[:pos] + '\n      NODE_OPTIONS: "' + NEW_REQUIRE + '"' + body[pos:]
    else:
        body = body.rstrip('\n') + '\n    environment:\n      NODE_OPTIONS: "' + NEW_REQUIRE + '"\n'
    return s[:start] + body + s[end:], 'upgrade-v1' if old else 'new-install'

def compose_check():
    p = subprocess.run(['docker','compose','config','-q'], cwd=ROOT, capture_output=True, text=True)
    if p.returncode: stop('docker compose config invalid: ' + p.stderr[-500:])

def main():
    cmd = argparse.ArgumentParser()
    cmd.add_argument('action', choices=['check','install','upgrade','restore','status'])
    args = cmd.parse_args()
    if not ROOT.is_dir(): stop(f'engine folder missing: {ROOT}')
    orig = OVERRIDE.read_text() if OVERRIDE.exists() else ''
    if args.action == 'status':
        print('v1 present:', bool(state_of(orig)[0]), 'v2 present:', bool(state_of(orig)[1]), 'backup:', STATE.exists())
        return
    if args.action == 'restore':
        if not STATE.exists(): stop('no v2 backup state')
        meta = (STATE / 'sha256').read_text().strip()
        if digest(orig.encode()) != meta: stop('override changed after install; manual reconciliation needed')
        original = STATE / 'override.before'
        if original.exists(): OVERRIDE.write_bytes(original.read_bytes())
        else: OVERRIDE.unlink(missing_ok=True)
        try: compose_check()
        except BaseException:
            OVERRIDE.write_text(orig)
            raise
        shutil.rmtree(STATE)
        print('CONFIG RESTORED. Run: cd /root/Marinara-Engine && docker compose up -d --no-deps marinara')
        return
    if not SRC.is_file(): stop('gacha-ko-runtime.cjs must be beside this script')
    script = SRC.read_text()
    if 'gacha-ko-bg-and-speaker-runtime-v2' not in script: stop('unrecognized runtime source')
    result, mode = patch(orig)
    if args.action == 'upgrade' and mode == 'new-install': stop('v1 not detected; use install instead')
    if args.action == 'check':
        print('CHECK OK:', mode, '; existing speedup hook is optional and preserved')
        return
    if mode == 'already-v2':
        print('v2 already configured; no changes made')
        return
    if STATE.exists(): stop('prior v2 backup state exists; do not overwrite, inspect or restore first')
    STATE.mkdir(mode=0o700)
    if OVERRIDE.exists(): (STATE / 'override.before').write_bytes(OVERRIDE.read_bytes())
    if TARGET.exists(): (STATE / 'runtime.before').write_bytes(TARGET.read_bytes())
    try:
        TARGET.write_bytes(SRC.read_bytes())
        OVERRIDE.write_text(result)
        compose_check()
        (STATE / 'sha256').write_text(digest(OVERRIDE.read_bytes()))
        print('CONFIG APPLIED:', mode)
        print('Run: cd /root/Marinara-Engine && docker compose up -d --no-deps marinara')
    except BaseException:
        if (STATE / 'override.before').exists(): OVERRIDE.write_bytes((STATE / 'override.before').read_bytes())
        else: OVERRIDE.unlink(missing_ok=True)
        if (STATE / 'runtime.before').exists(): TARGET.write_bytes((STATE / 'runtime.before').read_bytes())
        else: TARGET.unlink(missing_ok=True)
        shutil.rmtree(STATE)
        raise

if __name__ == '__main__': main()
