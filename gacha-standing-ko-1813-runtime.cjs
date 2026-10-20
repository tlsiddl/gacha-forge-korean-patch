'use strict';
// Gacha Forge 1.8.13 standing speaker only; background slugs are handled upstream.
// In-memory route hook; does not change installed package files.
const { registerHooks } = require('node:module');
const { fileURLToPath } = require('node:url');
const fs = require('node:fs');
const ROUTE = '/app/packages/server/dist/routes/capability-packages.routes.js';
const MARKER = 'const entrypoint = await capabilityPackageManager.clientEntrypoint(id);';
const OLD = 'function Kl(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/gu,"").replace(/[^a-z0-9 ]/gu," ").replace(/\\s+/gu," ").trim()}';
const NEW = 'function Kl(t){return String(t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/gu,"").normalize("NFC").replace(/[^\\p{L}\\p{N} ]/gu," ").replace(/\\s+/gu," ").trim()}';
const count = (s,n) => s.split(n).length - 1;
function transformRoute(source) {
  if (count(source, MARKER) !== 1 ||
      count(source, 'const etag = packageFileEtag(entrypoint.sha256);') !== 1 ||
      count(source, 'return reply.send(entrypoint.data);') !== 1) return null;
  const injected = [
    'if (id === "gacha-forge" && entrypoint && Buffer.isBuffer(entrypoint.data)) {',
    'const before = entrypoint.data.toString("utf8");',
    'const oldSpeaker = ' + JSON.stringify(OLD) + ';',
    'const newSpeaker = ' + JSON.stringify(NEW) + ';',
    'if (before.split(oldSpeaker).length === 2) {',
    'const updated = Buffer.from(before.replace(oldSpeaker, newSpeaker), "utf8");',
    'entrypoint.data = updated;',
    'entrypoint.sha256 = __gfStandingKoHash(updated);',
    '} else process.stderr.write("[gacha-standing-ko] client signature mismatch; skipped\\n");',
    '}'
  ].join('\n');
  return 'import { createHash as __gfStandingKoCreateHash } from "node:crypto";\n' +
    'const __gfStandingKoHash = b => __gfStandingKoCreateHash("sha256").update(b).digest("hex");\n' +
    source.replace(MARKER, MARKER + '\n' + injected);
}
if (process.env.GF_STANDING_KO_TEST !== '1') {
  if (Number(process.versions.node.split('.')[0]) < 22) {
    process.stderr.write('[gacha-standing-ko] Node 22+ required; inactive\n');
  } else {
    registerHooks({load(url,context,nextLoad) {
      if (!url.startsWith('file:')) return nextLoad(url,context);
      let file;
      try { file = fileURLToPath(url); } catch { return nextLoad(url,context); }
      if (file !== ROUTE) return nextLoad(url,context);
      const response = nextLoad(url,context);
      const source = response.source == null ? fs.readFileSync(file,'utf8') :
        Buffer.isBuffer(response.source) ? response.source.toString('utf8') : String(response.source);
      const updated = transformRoute(source);
      if (!updated) {
        process.stderr.write('[gacha-standing-ko] route signature mismatch; skipped\n');
        return response;
      }
      process.stderr.write('[gacha-standing-ko] route transformed in memory\n');
      return {...response,source:updated,shortCircuit:true};
    }});
    process.stderr.write('[gacha-standing-ko] hook registered\n');
  }
}
module.exports = {OLD,NEW,transformRoute};
