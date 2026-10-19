'use strict';
// Gacha Forge 1.8.12 Korean location and speaker hotfix. NO disk writes.
// Loaded via NODE_OPTIONS --require; changes ESM source only in memory.
const { registerHooks } = require('node:module');
const { fileURLToPath } = require('node:url');
const fs = require('node:fs');
const crypto = require('node:crypto');
const TARGET_SERVER = /\/capability-runtime-snapshots\/gacha-forge-1\.8\.12-[^/]+\/server\.mjs$/;
const TARGET_ROUTE = '/app/packages/server/dist/routes/capability-packages.routes.js';
const SLUG_EXPR = 'replace(/[^a-z0-9]+/g,"-")';
const UNICODE_EXPR = 'replace(/[^\\p{L}\\p{N}]+/gu,"-")';
const CLIENT_SNIPPET = 'function oc(t){return String(t??"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,60)}';
const PATCHED_CLIENT_SNIPPET = CLIENT_SNIPPET.replace(SLUG_EXPR, UNICODE_EXPR);
const CLIENT = '/app/data/capability-packages/versions/gacha-forge/1.8.12/client.js';
const M = '/app/data/capability-packages/versions/gacha-forge/1.8.12/manifest.json';
const ROUTE_MARKER = 'const entrypoint = await capabilityPackageManager.clientEntrypoint(id);';
const PATCH_TAG = 'gacha-ko-bg-and-speaker-runtime-v2';
const SPEAKER_OLD = 'function Kl(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/gu,"").replace(/[^a-z0-9 ]/gu," ").replace(/\\s+/gu," ").trim()}';
const SPEAKER_NEW = 'function Kl(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/gu,"").normalize("NFC").replace(/[^\\p{L}\\p{N} ]/gu," ").replace(/\\s+/gu," ").trim()}';
function matchCount(haystack, needle) { return haystack.split(needle).length - 1; }
function isKnownClient() {
  try {
    const m = JSON.parse(fs.readFileSync(M, 'utf8'));
    const declared = m.files.find(x => x.path === 'client.js');
    const b = fs.readFileSync(CLIENT);
    return declared && declared.sha256 === crypto.createHash('sha256').update(b).digest('hex') && declared.bytes === b.length && matchCount(b.toString('utf8'), CLIENT_SNIPPET) === 1 && matchCount(b.toString('utf8'), SPEAKER_OLD) === 1;
  } catch { return false; }
}
if (Number(process.versions.node.split('.')[0]) < 22) {
  process.stderr.write('[gacha-ko-bg] unsupported Node; inactive\n');
} else if (!isKnownClient()) {
  process.stderr.write('[gacha-ko-bg] client version/hash unrecognized; inactive (fail-open)\n');
} else {
  registerHooks({
    load(url, context, nextLoad) {
      if (!url.startsWith('file:')) return nextLoad(url, context);
      let file;
      try { file = fileURLToPath(url); } catch { return nextLoad(url, context); }
      const server = TARGET_SERVER.test(file);
      const route = file === TARGET_ROUTE;
      if (!server && !route) return nextLoad(url, context);
      const response = nextLoad(url, context);
      const source = response.source == null ? fs.readFileSync(file, 'utf8') : Buffer.isBuffer(response.source) ? response.source.toString('utf8') : String(response.source);
      let updated = source;
      if (server) {
        const old = 'function gs(e){return String(e??"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,60)}';
        const newer = old.replace(SLUG_EXPR, UNICODE_EXPR);
        if (matchCount(source, old) === 1) updated = source.replace(old, newer);
        else process.stderr.write('[gacha-ko-bg] server signature mismatch; skipped\n');
      } else {
        if (matchCount(source, ROUTE_MARKER) === 1 && source.includes('const etag = packageFileEtag(entrypoint.sha256);') && source.includes('return reply.send(entrypoint.data);')) {
          const injected = `${ROUTE_MARKER}\n        if (id === "gacha-forge" && entrypoint && Buffer.isBuffer(entrypoint.data)) {\n            const original = entrypoint.data.toString("utf8");\n            const oldSlug = ${JSON.stringify(CLIENT_SNIPPET)};\n            const nextSlug = ${JSON.stringify(PATCHED_CLIENT_SNIPPET)};
            const oldSpeaker = ${JSON.stringify(SPEAKER_OLD)};
            const newSpeaker = ${JSON.stringify(SPEAKER_NEW)};\n            if (original.split(oldSlug).length === 2 && original.split(oldSpeaker).length === 2) {\n                const patched = Buffer.from(original.replace(oldSlug, nextSlug).replace(oldSpeaker, newSpeaker), "utf8");\n                entrypoint.data = patched;\n                entrypoint.sha256 = __gachaBgHash(patched);\n            }\n        }`;
          updated = source.replace(ROUTE_MARKER, injected);
          updated = 'import { createHash as __gachaBgCreateHash } from "node:crypto";\nconst __gachaBgHash = (b) => __gachaBgCreateHash("sha256").update(b).digest("hex");\n' + updated;
        } else process.stderr.write('[gacha-ko-bg] route signature mismatch; skipped\n');
      }
      if (updated !== source) {
        process.stderr.write(`[gacha-ko-bg] transformed ${server ? 'gacha server snapshot' : 'client route'} in memory (${PATCH_TAG})\n`);
        return { ...response, source: updated, shortCircuit: true };
      }
      return response;
    }
  });
  process.stderr.write('[gacha-ko-bg] loader hook registered (no installed files modified)\n');
}
