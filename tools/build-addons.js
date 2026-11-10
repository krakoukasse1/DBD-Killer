#!/usr/bin/env node
/* ============================================================================
   tools/build-addons.js
   Génère / complète public/addons.json (accessoires de TOUS les tueurs) à partir
   du wiki officiel Dead by Daylight (version française).

   Sources :
   - Module de données du wiki (Module:Datatable/Loadout) -> rareté + tueur de chaque accessoire
   - Page de chaque tueur ("Accessoires pour ...")         -> nom FR, description FR, icône exacte

   Utilisation (depuis la racine du projet, Node 18 ou plus) :
     node tools/build-addons.js                 # ajoute les tueurs manquants (ne touche pas aux autres)
     node tools/build-addons.js --only=21,22    # seulement certains tueurs (numéros du wiki)
     node tools/build-addons.js --all           # régénère TOUS les tueurs
     node tools/build-addons.js --no-fetch      # n'utilise que le dossier tools/cache (hors ligne)

   Si le téléchargement est refusé par le site : ouvre la page dans ton navigateur,
   « Enregistrer sous » -> « Page web, HTML uniquement », et copie le fichier dans
   tools/cache/ avec le nom indiqué dans le message d'erreur. Relance ensuite avec --no-fetch.
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT  = path.resolve(__dirname, '..');
const OUT   = path.join(ROOT, 'public', 'addons.json');
const DATA  = path.join(ROOT, 'data.json');
const CACHE = path.join(__dirname, 'cache');
const WIKI  = 'https://deadbydaylight.wiki.gg/fr';
const IMG   = 'https://deadbydaylight.wiki.gg/images/';
const UA    = 'Mozilla/5.0 (compatible; DBD-Roulette-addons-builder/1.0)';

const RARITY = { 1: ['Common', 'Commun'], 2: ['Uncommon', 'Peu commun'], 3: ['Rare', 'Rare'], 4: ['Very Rare', 'Très rare'], 5: ['Ultra Rare', 'Ultra rare'] };

// numéro du tueur sur le wiki -> [nom dans data.json, titre de sa page FR sur le wiki]
const KILLERS = {
  1: ['Piegeur', 'Evan_MacMillan'], 2: ['Spectre', 'Philip_Ojomo'], 3: ['Montagnard', 'Max_Thompson_Jr.'], 4: ['Nurse', 'Sally_Smithson'],
  5: ['Silhouette', 'Michael_Myers'], 6: ['Harpie', 'Lisa_Sherwood'], 7: ['Docteur', 'Herman_Carter'], 8: ['Chasseuse', 'Anna'],
  9: ['Cannibale', 'Bubba_Sawyer'], 10: ['Cauchemar', 'Freddy_Krueger'], 11: ['Cochon', 'Amanda_Young'], 12: ['Clown', 'Jeffrey_Hawk'],
  13: ['Esprit', 'Rin_Yamaoka'], 14: ['Légion', 'Frank,_Julie,_Susie,_Joey'], 15: ['Épidémie', 'Adiris'], 16: ['GhostFace', 'Danny_Johnson'],
  17: ['Démogorgon', 'Démogorgon'], 18: ['Oni', 'Kazan_Yamaoka'], 19: ['LanceMort', 'Caleb_Quinn'], 20: ['Bourreau', 'Pyramid_Head'],
  21: ['Fléau', 'Talbot_Grimes'], 22: ['Jumeaux', 'Charlotte_et_Victor_Deshayes'], 23: ['Farceur', 'Ji-Woon_Hak'], 24: ['Nemesis', 'Nemesis_Type_T'],
  25: ['Cénobite', 'Elliot_Spencer'], 26: ['Artiste', 'Carmina_Mora'], 27: ['Onryō', 'Sadako_Yamamura'], 28: ['Dragage', 'Dragage'],
  29: ['Mastermind', 'Albert_Wesker'], 30: ['Chevalier', 'Tarhos_Kovács'], 31: ['Marchande de crâne', 'Adriana_Imai'], 32: ['Singularité', 'HUX-A7-13'],
  33: ['Xénomorphe', 'Xénomorphe'], 34: ['Chucky', 'Charles_Lee_Ray'], 35: ["L'inconnu", 'Inconnu'], 36: ['Vecna', 'Vecna'],
  37: ['Dracula', 'Dracula'], 38: ['Houndmaster', 'Portia_Maye'], 39: ['Ken Kaneki', 'Ken_Kaneki'], 40: ['Springtrap', 'William_Afton'],
  41: ['The Krasue', 'Burong_Sukapat'], 42: ['The First', 'Henry_Creel'], 43: ['Jason', 'Jason_Voorhees'],
};

if (typeof fetch !== 'function') { console.error('✖ Il faut Node 18 ou plus (node -v pour vérifier).'); process.exit(1); }

// ------------------------------------------------------------------ arguments
const args = process.argv.slice(2);
const flag = n => args.includes('--' + n);
const opt = n => { const a = args.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : null; };
const NO_FETCH = flag('no-fetch');
const ALL = flag('all');
const ONLY = opt('only') ? opt('only').split(',').map(Number).filter(Boolean) : null;

// ------------------------------------------------------------------ outils
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const safeName = s => s.replace(/[^\w.\-]/g, '_');

function decodeEntities(s) {
  return s.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}
function htmlToText(html) {
  return decodeEntities(html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')).replace(/[ \t\u00a0]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}
const oneLine = s => s.replace(/\s+/g, ' ').trim();
const joinSegs = a => a.map(x => (/[.!?…)»]$/.test(x) ? x : x + '.')).join(' ');

async function download(url) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.text();
    } catch (e) { lastErr = e; await sleep(800 * (i + 1)); }
  }
  throw lastErr;
}
// renvoie le contenu du cache, sinon télécharge (essaie plusieurs adresses) et met en cache
async function getCached(file, urls) {
  const p = path.join(CACHE, file);
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  if (NO_FETCH) throw new Error(`Fichier absent du cache : tools/cache/${file}`);
  fs.mkdirSync(CACHE, { recursive: true });
  let err;
  for (const u of urls) {
    try { const t = await download(u); fs.writeFileSync(p, t); await sleep(400); return t; }
    catch (e) { err = e; }
  }
  throw new Error(`Téléchargement impossible (${err && err.message}). Enregistre la page toi-même dans tools/cache/${file}`);
}

// ------------------------------------------------------------------ module Lua (rareté + tueur)
function parseLoadout(text) {
  if (/<html|<!doctype/i.test(text)) text = htmlToText(text);
  const lines = text.split(/\r?\n/);
  const out = [];
  let inAddons = false;
  for (const line of lines) {
    if (/^\s*p\.addons\s*=\s*\{/.test(line)) { inAddons = true; continue; }
    if (inAddons && /^\s*\}\s*$/.test(line)) break;
    if (!inAddons || /^\s*--/.test(line)) continue;
    const m = line.match(/^\s*\[\s*(["'])/);
    if (!m) continue;
    const q = m[1];
    let i = line.indexOf(q) + 1, key = '';
    while (i < line.length) {
      const c = line[i];
      if (c === '\\') { key += line[i + 1]; i += 2; continue; }
      if (c === q) break;
      key += c; i++;
    }
    const rest = line.slice(i + 1);
    const m2 = rest.match(/^\s*\]\s*=\s*\{([\s\S]*)$/);
    if (!m2) continue;
    const body = m2[1];
    const num = n => { const x = body.match(new RegExp('\\b' + n + '\\s*=\\s*(\\d+)')); return x ? +x[1] : null; };
    const yes = n => new RegExp('\\b' + n + '\\s*=\\s*true').test(body);
    const dn = body.match(/displayName\s*=\s*(["'])((?:\\.|(?!\1).)*)\1/);
    out.push({
      key, name: dn ? dn[2].replace(/\\(.)/g, '$1') : key.replace(/\s*\([^)]*\)\s*$/, ''),
      rarity: num('rarity'), killer: num('killer'),
      excluded: yes('decom') || yes('unused') || yes('notAvailable') || yes('deprecated'),
    });
  }
  return out;
}

// ------------------------------------------------------------------ page du tueur (tableau « Accessoires pour ... »)
function iconFile(cell) {
  const m0 = cell.match(/(IconAddon_[^/"'?\s>]+?\.(?:png|webp|jpe?g))/i);          // cas habituel
  if (m0) return m0[1];
  const src = (cell.match(/<img[^>]+src="([^"]+)"/i) || [])[1];                    // sinon : n'importe quelle image
  if (!src) return null;
  const m = src.match(/\/images\/(?:thumb\/)?(?:[0-9a-f]\/[0-9a-f]{2}\/)?([^/?]+\.(?:png|webp|jpe?g|gif))/i);
  return m ? m[1] : null;
}

function tableRows(tableHtml) {
  const rows = [];
  const rr = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let r;
  while ((r = rr.exec(tableHtml))) {
    const cells = [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => c[1]);
    if (cells.length < 3) continue;
    const icon = iconFile(cells[0]);
    if (!icon) continue;
    const name = oneLine(htmlToText(cells[1]));
    if (!name) continue;
    const segs = cells[2].replace(/<\/?(li|p|ul|ol)[^>]*>/gi, '\u0001').replace(/<br\s*\/?>/gi, '\u0001').split('\u0001')
      .map(s => ({ bold: /<(b|strong)\b/i.test(s), text: oneLine(htmlToText(s)) })).filter(s => s.text);
    let k = segs.findIndex(s => s.bold);
    if (k < 0) k = segs.length > 1 ? 1 : 0;           // sans gras : la 1re ligne est l'ambiance, le reste l'effet
    rows.push({
      name, icon,
      background: joinSegs(segs.slice(0, k).map(s => s.text)),
      description: joinSegs(segs.slice(k).map(s => s.text)),
    });
  }
  return rows;
}

function parseKillerPage(html) {
  const start = html.search(/id="Accessoires/);
  const tables = [];
  const re = /<table[\s\S]*?<\/table>/gi;
  let m;
  while ((m = re.exec(html))) {
    const rows = tableRows(m[0]);
    if (rows.length >= 5) tables.push({ idx: m.index, rows });
  }
  if (!tables.length) return [];
  let t = start >= 0 ? tables.find(x => x.idx > start) : null;
  if (!t) t = tables.slice().sort((a, b) => b.rows.length - a.rows.length)[0];
  return t.rows;
}

// aide au diagnostic quand aucune table n'est trouvée
function pageInfo(html) {
  const imgs = (html.match(/<img[^>]+>/gi) || []);
  const addon = imgs.filter(x => /addon/i.test(x)).length;
  return `page de ${Math.round(html.length / 1024)} Ko, ${(html.match(/<table/gi) || []).length} tableau(x), ${imgs.length} image(s) dont ${addon} « addon »`;
}

// ------------------------------------------------------------------ programme principal
(async () => {
  const warnings = [];
  const dataNames = (() => {
    try { const d = JSON.parse(fs.readFileSync(DATA, 'utf8')); return new Set((d.killers || []).map(c => c.name.trim())); }
    catch (_) { return null; }
  })();

  console.log('→ Lecture du module de données du wiki…');
  const lua = await getCached('module_Loadout.lua', [
    `${WIKI}/wiki/Module:Datatable/Loadout?action=raw`,
    `${WIKI}/index.php?title=Module:Datatable/Loadout&action=raw`,
    `${WIKI}/wiki/Module:Datatable/Loadout`,
  ]);
  const entries = parseLoadout(lua);
  console.log(`  ${entries.length} accessoires lus, dont ${entries.filter(e => e.killer >= 1).length} liés à un tueur.`);
  if (!entries.length) throw new Error('Aucun accessoire trouvé dans le module : format inattendu.');

  let existing = { meta: {}, killers: {} };
  if (fs.existsSync(OUT)) existing = JSON.parse(fs.readFileSync(OUT, 'utf8'));

  let ids = Object.keys(KILLERS).map(Number);
  if (ONLY) ids = ids.filter(i => ONLY.includes(i));
  else if (!ALL) ids = ids.filter(i => !existing.killers[KILLERS[i][0]]);
  console.log(`→ Tueurs à traiter : ${ids.length ? ids.join(', ') : '(aucun, tout est déjà présent)'}`);

  for (const id of ids) {
    const [dataName, title] = KILLERS[id];
    if (dataNames && !dataNames.has(dataName)) warnings.push(`« ${dataName} » (tueur ${id}) n'existe pas dans data.json : nom à vérifier.`);
    let rows;
    try {
      const html = await getCached(`page_${safeName(title)}.html`, [`${WIKI}/wiki/${encodeURI(title)}`]);
      rows = parseKillerPage(html);
      if (!rows.length) { warnings.push(`${dataName} : aucun tableau d'accessoires trouvé (${pageInfo(html)}) — fichier tools/cache/page_${safeName(title)}.html`); continue; }
    } catch (e) { warnings.push(`${dataName} : ${e.message}`); continue; }

    // Quel numéro de tueur dans le module correspond à cette page ? -> celui dont le plus de noms recoupent le tableau
    const names = new Set(rows.map(r => norm(r.name)));
    const score = new Map();
    entries.forEach(e => { if (e.killer >= 1 && names.has(norm(e.name))) score.set(e.killer, (score.get(e.killer) || 0) + 1); });
    const best = [...score.entries()].sort((a, b) => b[1] - a[1])[0];
    const need = Math.min(10, Math.ceil(rows.length / 2));
    if (!best || best[1] < need) { warnings.push(`${dataName} : impossible d'associer la page au module (meilleur recoupement : ${best ? best[1] : 0}/${rows.length}). Vérifie le titre de page dans KILLERS.`); continue; }
    const modId = best[0];
    if (modId !== id) console.log(`  (info) ${dataName} : numéro de tueur dans le module = ${modId} (au lieu de ${id})`);
    const mod = entries.filter(e => e.killer === modId && !e.excluded && e.rarity >= 1 && e.rarity <= 5);

    const pool = new Map();                                  // nom normalisé -> lignes de la page
    rows.forEach(r => { const k = norm(r.name); (pool.get(k) || pool.set(k, []).get(k)).push(r); });
    const addons = [];
    const add = (e, row) => addons.push({
      id: `k${String(id).padStart(2, '0')}_${slug(e.key)}`,
      name: row.name, name_en: null,
      rarity: RARITY[e.rarity][0], rarity_fr: RARITY[e.rarity][1],
      image: IMG + row.icon, image_verified: true,
      description: row.description, background: row.background,
    });
    // passe 1 : même nom
    let lonely = [];
    for (const e of mod) {
      const list = pool.get(norm(e.name));
      const row = list && list.shift();
      if (row) add(e, row); else lonely.push(e);
    }
    let rest = [...pool.values()].flat();
    // passe 2 : nom proche (l'un commence par l'autre, ex. « Calice » / « Calice (Or) »), seulement si sans ambiguïté
    const close = (a, b) => { const x = norm(a), y = norm(b); return x && y && (x.startsWith(y) || y.startsWith(x)); };
    for (const e of [...lonely]) {
      const cands = rest.filter(r => close(e.name, r.name));
      if (cands.length === 1 && lonely.filter(o => close(o.name, cands[0].name)).length === 1) {
        add(e, cands[0]);
        warnings.push(`${dataName} : « ${e.name} » associé à « ${cands[0].name} » (noms proches) : à vérifier.`);
        lonely = lonely.filter(o => o !== e); rest = rest.filter(r => r !== cands[0]);
      }
    }
    // passe 3 : un seul reste de chaque côté -> association par élimination
    if (lonely.length === 1 && rest.length === 1) {
      add(lonely[0], rest[0]);
      warnings.push(`${dataName} : « ${lonely[0].name} » associé à « ${rest[0].name} » par élimination : à vérifier.`);
      lonely = []; rest = [];
    }
    lonely.forEach(e => warnings.push(`${dataName} : « ${e.name} » (rareté ${e.rarity}) est dans le module mais pas dans la page (ignoré).`));
    rest.forEach(r => warnings.push(`${dataName} : « ${r.name} » est dans la page mais pas dans le module (ignoré : rareté inconnue).`));
    const seen = new Set();
    addons.forEach(a => { let u = a.id, n = 2; while (seen.has(u)) u = a.id + '_' + n++; a.id = u; seen.add(u); });
    addons.sort((a, b) => Object.values(RARITY).findIndex(x => x[0] === a.rarity) - Object.values(RARITY).findIndex(x => x[0] === b.rarity) || a.name.localeCompare(b.name, 'fr'));
    if (addons.length < 18 || addons.length > 21) warnings.push(`${dataName} : ${addons.length} accessoires (20 attendus) : à vérifier.`);
    const old = existing.killers[dataName];
    if (old && addons.length < old.addons.length) {
      warnings.push(`${dataName} : nouveau résultat moins complet (${addons.length} < ${old.addons.length}) : version existante CONSERVÉE.`);
      continue;
    }
    existing.killers[dataName] = { id: slug(dataName), name: dataName, name_en: null, wiki_killer_id: id, addons };
    console.log(`  ✓ ${dataName} : ${addons.length} accessoires`);
  }

  const have = new Set(Object.keys(existing.killers));
  existing.meta = Object.assign({}, existing.meta, {
    source: 'Wiki officiel Dead by Daylight (version française) : module Datatable/Loadout + pages des tueurs',
    updated: new Date().toISOString().slice(0, 10),
    coverage: {
      killers_included: have.size,
      addons: Object.values(existing.killers).reduce((n, k) => n + k.addons.length, 0),
      killers_missing: Object.values(KILLERS).map(k => k[0]).filter(n => !have.has(n)).join(', '),
    },
  });
  fs.writeFileSync(OUT, JSON.stringify(existing, null, 1), 'utf8');
  console.log(`\n✔ ${path.relative(ROOT, OUT)} écrit : ${have.size} tueurs, ${existing.meta.coverage.addons} accessoires.`);
  if (warnings.length) { console.log('\nÀ vérifier :'); warnings.forEach(w => console.log('  - ' + w)); }
})().catch(e => { console.error('\n✖ ' + e.message); process.exit(1); });
