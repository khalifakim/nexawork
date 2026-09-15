// Seeder de démonstration NexaWork.
// Prérequis : stack démarrée (gateway sur :8080), base vierge (après reset/truncate).
// Lancement : node scripts/seed-demo/seed.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { basename } from 'node:path';
import { execSync } from 'node:child_process';
import {
  PASSWORD, USERS, emailOf, WS_PRIMARY, WS_SECONDARY, WS_SECONDARY_MEMBERS,
  PROJECTS, TASKS, DOCS_DIR, FOLDERS, GED_FILES, GED_PROJECT_FILES, SHARE_LINKS, CHANNELS,
} from './data.mjs';

const BASE = 'http://localhost:8080';
const REPO = 'D:/memoire-master/nexawork';
const CTX = {
  auth: '/nexawork-auth-api-v1/api/v1',
  project: '/nexawork-project-api-v1/api/v1',
  ged: '/nexawork-ged-api-v1/api/v1',
  file: '/nexawork-file-api-v1/api/v1',
  messaging: '/nexawork-messaging-api-v1/api/v1',
};
const TODAY = new Date('2026-07-26T12:00:00');
const iso = (offsetDays) => { const d = new Date(TODAY); d.setDate(d.getDate() + offsetDays); return d.toISOString().slice(0, 10); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

// ── HTTP bas niveau ────────────────────────────────────────────────────────────
async function req(method, service, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const url = `${BASE}${CTX[service]}${path}`;
  for (let attempt = 1; ; attempt++) {
    let res;
    try { res = await fetch(url, { method, headers, body: payload }); }
    catch (e) { if (attempt <= 5) { await sleep(1500); continue; } throw new Error(`${method} ${url} — réseau : ${e.message}`); }
    if ((res.status === 502 || res.status === 503) && attempt <= 6) { await sleep(2000); continue; }
    const text = await res.text();
    let json; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    if (!res.ok) throw new Error(`${method} ${service}${path} → ${res.status} ${typeof json === 'string' ? json : JSON.stringify(json)}`);
    return json && typeof json === 'object' && 'payload' in json ? json.payload : json;
  }
}

/** Type MIME d'après l'extension — sinon le fichier est servi en octet-stream
 *  (le navigateur télécharge au lieu de prévisualiser). */
const MIME = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', txt: 'text/plain',
  csv: 'text/csv', zip: 'application/zip', mp4: 'video/mp4', drawio: 'application/xml',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const mimeOf = (name) => MIME[(name.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';

async function uploadRaw(token, absPath, params) {
  const buf = readFileSync(absPath);
  const form = new FormData();
  form.append('context', 'ged');
  form.append('file', new Blob([buf], { type: mimeOf(absPath) }), basename(absPath));
  for (const [k, v] of Object.entries(params)) if (v != null) form.append(k, String(v));
  const res = await fetch(`${BASE}${CTX.file}/files`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const text = await res.text();
  if (!res.ok) throw new Error(`upload ${basename(absPath)} → ${res.status} ${text}`);
  const p = JSON.parse(text).payload;
  return { id: p.id, size: p.size, contentType: p.contentType, downloadUrl: `${CTX.file}/files/${p.id}/download` };
}

function sql(db, query) {
  return execSync(`docker compose exec -T postgres psql -U postgres -d ${db} -tAc "${query.replace(/"/g, '\\"')}"`,
    { cwd: REPO, encoding: 'utf8' }).trim();
}

// ── Couche d'authentification résiliente (re-login sur 401 / expiration) ────────
const creds = {};        // key → email
const userId = {};       // key → id
const tokCache = {};     // `${key}:${ws}` → { token, ts }
const TOKEN_TTL = 7 * 60 * 1000; // rafraîchit préventivement au bout de 7 min
let WS_A, WS_B;

async function freshToken(key, ws) {
  const login = await req('POST', 'auth', '/auth/login', { body: { email: creds[key], password: PASSWORD } });
  const r = await req('POST', 'auth', '/auth/refresh', { body: { refreshToken: login.refreshToken, workspaceId: ws } });
  tokCache[`${key}:${ws}`] = { token: r.accessToken, ts: Date.now() };
  return r.accessToken;
}
async function tokenOf(key, ws) {
  const c = tokCache[`${key}:${ws}`];
  if (c && Date.now() - c.ts < TOKEN_TTL) return c.token;
  return freshToken(key, ws);
}
const is401 = (e) => String(e.message).includes('→ 401') || String(e.message).includes(' 401 ');

// Requête authentifiée pour `key` dans le workspace `ws` (défaut : principal).
async function AX(key, ws, method, service, path, body) {
  let token = await tokenOf(key, ws);
  try { return await req(method, service, path, { token, body }); }
  catch (e) { if (is401(e)) { token = await freshToken(key, ws); return req(method, service, path, { token, body }); } throw e; }
}
const A = (key, method, service, path, body) => AX(key, WS_A, method, service, path, body);

async function upA(key, absPath, params) {
  let token = await tokenOf(key, WS_A);
  try { return await uploadRaw(token, absPath, params); }
  catch (e) { if (is401(e)) { token = await freshToken(key, WS_A); return uploadRaw(token, absPath, params); } throw e; }
}

// ── État runtime ────────────────────────────────────────────────────────────────
const projectIds = {};
const teamIds = {};
const taskByKey = {};
const folderIds = {};
const gedFileByName = {};
const channelIds = {};

// ── 1. Comptes + workspaces ────────────────────────────────────────────────────
async function setupUsersAndWorkspaces() {
  for (const u of USERS) creds[u.key] = emailOf(u);
  const founder = USERS[0];

  log('▶ Inscription du fondateur…', creds[founder.key]);
  await req('POST', 'auth', '/auth/register', { body: { firstName: founder.firstName, lastName: founder.lastName, email: creds[founder.key], password: PASSWORD, jobTitle: founder.jobTitle } });
  sql('nexawork_auth_db', `UPDATE users SET email_verified=true WHERE email='${creds[founder.key]}'`);

  const flogin = await req('POST', 'auth', '/auth/login', { body: { email: creds[founder.key], password: PASSWORD } });
  log('▶ Création des workspaces…');
  WS_A = (await req('POST', 'auth', '/workspaces', { token: flogin.accessToken, body: { name: WS_PRIMARY.name, color: WS_PRIMARY.color } })).id;
  WS_B = (await req('POST', 'auth', '/workspaces', { token: flogin.accessToken, body: { name: WS_SECONDARY.name, color: WS_SECONDARY.color } })).id;
  log(`  ${WS_PRIMARY.name} = ${WS_A}`);
  log(`  ${WS_SECONDARY.name} = ${WS_B}`);

  const others = USERS.slice(1);
  log('▶ Invitations workspace principal…');
  for (const u of others) await A(founder.key, 'POST', 'auth', `/workspaces/${WS_A}/invitations`, { emails: [creds[u.key]], role: u.role === 'ADMIN' ? 'ADMIN' : 'MEMBER' });
  await sleep(400);
  const tokByEmail = {};
  for (const line of sql('nexawork_auth_db', `SELECT email||'|'||token FROM invitations WHERE organisation_id='${WS_A}' AND status='PENDING'`).split('\n').filter(Boolean)) {
    const [e, t] = line.split('|'); tokByEmail[e] = t;
  }
  log('▶ Acceptation des invitations (création des comptes)…');
  for (const u of others) {
    const invToken = tokByEmail[creds[u.key]];
    if (!invToken) throw new Error(`Token d'invitation introuvable pour ${creds[u.key]}`);
    await req('POST', 'auth', `/invitations/${invToken}/accept`, { body: { firstName: u.firstName, lastName: u.lastName, email: creds[u.key], password: PASSWORD, jobTitle: u.jobTitle } });
  }

  log('▶ Récupération des identifiants utilisateurs…');
  for (const u of USERS) {
    const token = await freshToken(u.key, WS_A);
    userId[u.key] = (await req('GET', 'auth', '/users/me', { token })).id;
  }

  log('▶ Workspace secondaire : invitations + join…');
  for (const key of WS_SECONDARY_MEMBERS) await AX(founder.key, WS_B, 'POST', 'auth', `/workspaces/${WS_B}/invitations`, { emails: [creds[key]], role: 'MEMBER' });
  await sleep(400);
  const tokB = {};
  for (const line of sql('nexawork_auth_db', `SELECT email||'|'||token FROM invitations WHERE organisation_id='${WS_B}' AND status='PENDING'`).split('\n').filter(Boolean)) {
    const [e, t] = line.split('|'); tokB[e] = t;
  }
  for (const key of WS_SECONDARY_MEMBERS) {
    const login = await req('POST', 'auth', '/auth/login', { body: { email: creds[key], password: PASSWORD } });
    await req('POST', 'auth', `/invitations/${tokB[creds[key]]}/join`, { token: login.accessToken });
  }
}

// ── 2. Projets, équipes, tâches, commentaires ──────────────────────────────────
const pickStatus = (list, cat) => list.find(s => s.category === cat) ?? list[0];

async function setupProjects() {
  const F = USERS[0].key;
  for (const p of PROJECTS) {
    log(`▶ Projet « ${p.name} »…`);
    const proj = await A(F, 'POST', 'project', '/projects', { name: p.name, prefix: p.prefix, color: p.color, startDate: p.startDate, endDate: p.endDate });
    projectIds[p.key] = proj.id;
    for (const mk of p.members) await A(F, 'POST', 'project', `/projects/${proj.id}/members`, { userId: userId[mk] }).catch(() => {});
    await A(F, 'PATCH', 'project', `/projects/${proj.id}/members/${userId[p.chief]}`, { setAsProjectChief: true });
    for (const t of p.teams) {
      const team = await A(F, 'POST', 'project', `/projects/${proj.id}/teams`, { name: t.name, color: t.color });
      teamIds[`${p.key}:${t.name}`] = team.id;
      for (const mk of t.members) await A(F, 'PATCH', 'project', `/projects/${proj.id}/members/${userId[mk]}`, { teamId: team.id });
    }
    const statuses = await A(F, 'GET', 'project', `/projects/${proj.id}/statuses`);
    for (const t of TASKS[p.key]) {
      const body = { title: t.title, statusId: pickStatus(statuses, t.cat).id, priority: t.prio, startDate: iso(t.start), dueDate: iso(t.due), estimate: t.est };
      if (t.assignee && typeof t.assignee === 'object' && t.assignee.team) { body.assigneeType = 'TEAM'; body.assigneeId = teamIds[`${p.key}:${t.assignee.team}`]; }
      else if (typeof t.assignee === 'string') { body.assigneeType = 'USER'; body.assigneeId = userId[t.assignee]; }
      const card = await A(F, 'POST', 'project', `/projects/${proj.id}/tasks`, body);
      taskByKey[card.taskKey] = { id: card.id, key: card.taskKey };
      for (const s of (t.sub ?? [])) await A(F, 'POST', 'project', `/tasks/${card.id}/subtasks`, { title: s });
    }
    log(`  ${TASKS[p.key].length} tâches (préfixe ${p.prefix}).`);
  }
}

async function setupComments() {
  log('▶ Commentaires…');
  const C = (taskKey, from, text, mentions = []) => ({ taskKey, from, text, mentions });
  const comments = [
    C('NPAY-2', 'coumba', 'Les maquettes avancent bien. @Ibrahima peux-tu valider la variante du bouton de paiement ?', [{ type: 'USER', ref: 'ibrahima', text: 'Ibrahima' }]),
    C('NPAY-2', 'ibrahima', 'Validé pour moi. On lie ça à la tâche @@NPAY-4 pour l’intégration.', [{ type: 'TASK', ref: 'NPAY-4', text: 'NPAY-4' }]),
    C('NPAY-3', 'ousmane', 'Le endpoint /login est prêt. @Khalif on est un peu juste sur l’échéance.', [{ type: 'USER', ref: 'khalif', text: 'Khalif' }]),
    C('NPAY-7', 'moussa', 'Crash reproduit sur Android 13. Je pousse un correctif ce soir.'),
    C('WEB-1', 'fatou', 'Charte finalisée ✅ @Coumba tu peux partir là-dessus pour les maquettes.', [{ type: 'USER', ref: 'coumba', text: 'Coumba' }]),
    C('WEB-7', 'aicha', 'Toujours en attente des visuels fournisseur, ça bloque la bannière.'),
    C('INFRA-3', 'cheikh', 'Cluster provisionné. @Nassuf on enchaîne sur le monitoring.', [{ type: 'USER', ref: 'nassuf', text: 'Nassuf' }]),
    C('INFRA-7', 'ousmane', 'Fuite mémoire identifiée côté upload, correctif en cours.'),
  ];
  let ok = 0;
  for (const c of comments) {
    const task = taskByKey[c.taskKey]; if (!task) continue;
    const mentions = c.mentions.map(m => ({ type: m.type, targetId: m.type === 'USER' ? userId[m.ref] : taskByKey[m.ref]?.id, targetText: m.text })).filter(m => m.targetId);
    try { await A(c.from, 'POST', 'project', `/tasks/${task.id}/comments`, { content: c.text, attachments: [], mentions }); ok++; }
    catch (e) { log(`  ⚠ commentaire ${c.taskKey}/${c.from} : ${e.message}`); }
  }
  log(`  ${ok}/${comments.length} commentaires.`);
}

// ── 3. GED ──────────────────────────────────────────────────────────────────────
async function setupGed() {
  const F = USERS[0].key;
  // Résout le vrai nom sur disque (tolère les différences d'accents NFC/NFD).
  const dirFiles = readdirSync(DOCS_DIR);
  const abs = (name) => {
    const target = name.normalize('NFC');
    const hit = dirFiles.find(f => f.normalize('NFC') === target);
    return `${DOCS_DIR}/${hit ?? name}`;
  };
  log('▶ GED : dossiers…');
  for (const f of FOLDERS) {
    const folder = await A(F, 'POST', 'ged', '/ged/folders', { name: f.name, parentId: null, projectId: null, accessMode: f.access === 'PRIVATE' ? 'PRIVATE' : 'OPEN' });
    folderIds[f.name] = folder.id;
  }
  log('▶ GED : import des fichiers…');
  let n = 0;
  for (const gf of GED_FILES) {
    try {
      const stored = await upA(gf.owner, abs(gf.src), { workspaceId: WS_A });
      const file = await A(gf.owner, 'POST', 'ged', '/ged/files', {
        folderId: folderIds[gf.folder] ?? null, projectId: null, name: gf.name,
        fileUrl: stored.downloadUrl, fileSize: stored.size, contentType: stored.contentType,
        sourceFileId: stored.id, accessMode: gf.access === 'PRIVATE' ? 'PRIVATE' : 'OPEN',
      });
      gedFileByName[gf.name] = { id: file.id };
      if (gf.versionSrc) {
        const v = await upA(gf.owner, abs(gf.versionSrc), { workspaceId: WS_A });
        await A(gf.owner, 'POST', 'ged', `/ged/files/${file.id}/versions`, { sourceFileId: v.id, fileUrl: v.downloadUrl, fileSize: v.size, note: gf.versionNote });
      }
      if (gf.access === 'SHARED') {
        await A(gf.owner, 'PATCH', 'ged', `/ged/files/${file.id}/access`, { accessMode: 'SHARED' }).catch(() => {});
        for (const gk of (gf.grantTo ?? [])) await A(gf.owner, 'POST', 'ged', '/ged/grants', { targetType: 'FILE', targetId: file.id, granteeType: 'USER', granteeId: userId[gk], accessLevel: 'READER' }).catch(() => {});
      }
      n++;
    } catch (e) { log(`  ⚠ import ${gf.name} : ${e.message}`); }
  }
  for (const pf of GED_PROJECT_FILES) {
    try {
      const stored = await upA(pf.owner, abs(pf.src), { workspaceId: WS_A, projectId: projectIds[pf.project] });
      await A(pf.owner, 'POST', 'ged', '/ged/files', { folderId: null, projectId: projectIds[pf.project], name: pf.name, fileUrl: stored.downloadUrl, fileSize: stored.size, contentType: stored.contentType, sourceFileId: stored.id, accessMode: 'OPEN' });
      n++;
    } catch (e) { log(`  ⚠ import projet ${pf.name} : ${e.message}`); }
  }
  log('▶ GED : liens de partage…');
  let ls = 0;
  for (const s of SHARE_LINKS) {
    const targetId = s.target.type === 'FILE' ? gedFileByName[s.target.file]?.id : folderIds[s.target.folder];
    if (!targetId) { log(`  ⚠ cible introuvable ${JSON.stringify(s.target)}`); continue; }
    try { await A(s.by, 'POST', 'ged', '/ged/shares', { targetType: s.target.type, targetId, mode: s.mode }); ls++; }
    catch (e) { log(`  ⚠ lien ${s.mode} : ${e.message}`); }
  }
  log(`  ${n} fichiers importés, ${ls} liens de partage.`);
}

// ── 4. Messagerie ────────────────────────────────────────────────────────────────
function buildMentions(list) {
  return (list ?? []).map(m => {
    let targetId;
    if (m.type === 'USER') targetId = userId[m.ref];
    else if (m.type === 'TASK') targetId = taskByKey[m.ref]?.id;
    else if (m.type === 'CHANNEL') targetId = channelIds[m.ref];
    else if (m.type === 'DOCUMENT') targetId = gedFileByName[m.ref]?.id;
    return { type: m.type, targetId, targetText: m.text };
  }).filter(m => m.targetId);
}

async function setupMessaging() {
  const F = USERS[0].key;
  log('▶ Canaux…');
  for (const c of CHANNELS) {
    const ch = await A(F, 'POST', 'messaging', '/channels', { name: c.name, icon: c.icon, projectId: c.project ? projectIds[c.project] : null, readonly: c.readonly, isPrivate: c.private, memberUserIds: c.private ? (c.members ?? []).map(k => userId[k]) : [] });
    channelIds[c.key] = ch.id;
  }
  const CM = (channel, from, text, mentions) => ({ channel, from, text, mentions });
  const channelMsgs = [
    CM('general', 'khalif', 'Bienvenue à toute l’équipe sur Nexa Studio 👋 On centralise ici les échanges généraux.'),
    CM('general', 'fatou', 'Super ! Les maquettes NexaPay sont dans #design pour ceux que ça intéresse.', [{ type: 'CHANNEL', ref: 'design', text: 'design' }]),
    CM('general', 'ibrahima', 'Rappel : la tâche @@NPAY-3 est prioritaire cette semaine. @Ousmane on fait le point ?', [{ type: 'TASK', ref: 'NPAY-3', text: 'NPAY-3' }, { type: 'USER', ref: 'ousmane', text: 'Ousmane' }]),
    CM('annonces', 'khalif', '📢 Réunion de lancement du sprint vendredi 10h. Merci de préparer vos points.'),
    CM('dev-npay', 'ousmane', 'Push de l’API auth terminé. Doc à jour dans @@@Présentation NexaWork.pptx', [{ type: 'DOCUMENT', ref: 'Présentation NexaWork.pptx', text: 'Présentation NexaWork.pptx' }]),
    CM('dev-npay', 'moussa', 'Je prends le crash Android (@@NPAY-7), correctif ce soir.', [{ type: 'TASK', ref: 'NPAY-7', text: 'NPAY-7' }]),
    CM('design', 'coumba', 'Nouvelle version des maquettes dispo. @Fatou ton retour ?', [{ type: 'USER', ref: 'fatou', text: 'Fatou' }]),
    CM('infra', 'cheikh', 'Cluster K8s en ligne 🎉 @Said tu es dispo pour la migration DB ?', [{ type: 'USER', ref: 'said', text: 'Said' }]),
    CM('direction', 'khalif', 'Point budget prévisionnel à valider avant vendredi. @Zalifa @Fatou', [{ type: 'USER', ref: 'zalifa', text: 'Zalifa' }, { type: 'USER', ref: 'fatou', text: 'Fatou' }]),
  ];
  log('▶ Messages de canaux…');
  for (const m of channelMsgs) {
    const chId = channelIds[m.channel]; if (!chId) continue;
    try { await A(m.from, 'POST', 'messaging', `/channels/${chId}/messages`, { content: m.text, mentions: buildMentions(m.mentions) }); }
    catch (e) { log(`  ⚠ msg #${m.channel}/${m.from} : ${e.message}`); }
  }
  log('▶ Conversations privées…');
  const convos = [
    { a: 'khalif', b: 'ibrahima', msgs: [
      { from: 'khalif', text: 'Salut @Ibrahima, où en est-on sur la revue de sécurité @@NPAY-9 ?', m: [{ type: 'USER', ref: 'ibrahima', text: 'Ibrahima' }, { type: 'TASK', ref: 'NPAY-9', text: 'NPAY-9' }] },
      { from: 'ibrahima', text: 'Je la planifie la semaine prochaine, dès que l’intégration paiement est stable.' },
      { from: 'khalif', text: 'Parfait, merci 🙏' },
    ] },
    { a: 'fatou', b: 'coumba', msgs: [
      { from: 'fatou', text: 'Coumba, le doc @@@Schéma projet collaboratif.drawio est à jour ?', m: [{ type: 'DOCUMENT', ref: 'Schéma projet collaboratif.drawio', text: 'Schéma projet collaboratif.drawio' }] },
      { from: 'coumba', text: 'Oui je viens de pousser la nouvelle version, regarde dans #design', m: [{ type: 'CHANNEL', ref: 'design', text: 'design' }] },
    ] },
    { a: 'cheikh', b: 'said', msgs: [
      { from: 'cheikh', text: 'Said, on cale la migration DB @@INFRA-5 sur mercredi ?', m: [{ type: 'TASK', ref: 'INFRA-5', text: 'INFRA-5' }] },
      { from: 'said', text: 'Ça me va. Je prépare le plan de bascule d’ici là.' },
    ] },
  ];
  for (const cv of convos) {
    try {
      const conv = await A(cv.a, 'POST', 'messaging', '/conversations', { userId: userId[cv.b] });
      for (const m of cv.msgs) await A(m.from, 'POST', 'messaging', `/conversations/${conv.id}/messages`, { content: m.text, mentions: buildMentions(m.m) });
    } catch (e) { log(`  ⚠ conversation ${cv.a}/${cv.b} : ${e.message}`); }
  }
  log(`  ${channelMsgs.length} messages de canaux, ${convos.length} conversations.`);
}

// ── 5. Workspace secondaire (léger) ────────────────────────────────────────────
async function setupSecondaryWorkspace() {
  log('▶ Workspace secondaire : contenu léger…');
  const F = USERS[0].key;
  const proj = await AX(F, WS_B, 'POST', 'project', '/projects', { name: 'Suivi coopératif', prefix: 'COOP', color: '#2BB673', startDate: '2026-07-01', endDate: '2026-12-31' });
  const statuses = await AX(F, WS_B, 'GET', 'project', `/projects/${proj.id}/statuses`);
  const st = (cat) => (statuses.find(s => s.category === cat) ?? statuses[0]).id;
  await AX(F, WS_B, 'POST', 'project', `/projects/${proj.id}/tasks`, { title: 'Recenser les membres de la coopérative', statusId: st('ACTIVE'), priority: 'HIGH', startDate: iso(-5), dueDate: iso(10) });
  await AX(F, WS_B, 'POST', 'project', `/projects/${proj.id}/tasks`, { title: 'Préparer l’assemblée générale', statusId: st('NOT_STARTED'), priority: 'MEDIUM', startDate: iso(3), dueDate: iso(20) });
  const ch = await AX(F, WS_B, 'POST', 'messaging', '/channels', { name: 'général', icon: 'HASH', projectId: null, readonly: false, isPrivate: false, memberUserIds: [] });
  await AX(F, WS_B, 'POST', 'messaging', `/channels/${ch.id}/messages`, { content: 'Espace de la coopérative Dakar-Moroni — bienvenue !', mentions: [] });
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  await setupUsersAndWorkspaces();
  await setupProjects();
  await setupComments();
  await setupGed();
  await setupMessaging();
  await setupSecondaryWorkspace();
  log(`\n✅ Terminé en ${Math.round((Date.now() - t0) / 1000)}s.`);
  log(`Workspaces : A(${WS_PRIMARY.name})=${WS_A}  B(${WS_SECONDARY.name})=${WS_B}`);
  log('Comptes (mot de passe « motdepasse ») :');
  for (const u of USERS) log(`  ${creds[u.key].padEnd(34)} ${u.firstName} ${u.lastName} — ${u.jobTitle}`);
}
main().catch(e => { console.error('\n❌ ÉCHEC :', e.message); process.exit(1); });
