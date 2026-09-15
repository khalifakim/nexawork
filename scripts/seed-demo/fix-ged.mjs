// Ajoute les 2 fichiers GED manquants au workspace « Nexa Studio » déjà seedé.
import { readFileSync, readdirSync } from 'node:fs';
import { basename } from 'node:path';
const BASE = 'http://localhost:8080';
const CTX = { auth: '/nexawork-auth-api-v1/api/v1', ged: '/nexawork-ged-api-v1/api/v1', file: '/nexawork-file-api-v1/api/v1' };
const DOCS_DIR = 'D:/memoire-master/nexawork/notes/doc-test-nexawork';
const PASSWORD = 'motdepasse';

async function req(method, service, path, { token, body } = {}) {
  const headers = {}; if (token) headers.Authorization = `Bearer ${token}`;
  let payload; if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(`${BASE}${CTX[service]}${path}`, { method, headers, body: payload });
  const text = await res.text(); let j; try { j = text ? JSON.parse(text) : null; } catch { j = text; }
  if (!res.ok) throw new Error(`${method} ${service}${path} → ${res.status} ${typeof j === 'string' ? j : JSON.stringify(j)}`);
  return j && typeof j === 'object' && 'payload' in j ? j.payload : j;
}
async function upload(token, absPath, wsId) {
  const form = new FormData(); form.append('context', 'ged'); form.append('file', new Blob([readFileSync(absPath)]), basename(absPath)); form.append('workspaceId', wsId);
  const res = await fetch(`${BASE}${CTX.file}/files`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const text = await res.text(); if (!res.ok) throw new Error(`upload → ${res.status} ${text}`);
  const p = JSON.parse(text).payload; return { id: p.id, size: p.size, contentType: p.contentType, downloadUrl: `${CTX.file}/files/${p.id}/download` };
}
const resolve = (name) => { const t = name.normalize('NFC'); const hit = readdirSync(DOCS_DIR).find(f => f.normalize('NFC') === t); return `${DOCS_DIR}/${hit ?? name}`; };

const login = await req('POST', 'auth', '/auth/login', { body: { email: 'akimkhalif7@gmail.com', password: PASSWORD } });
const ws = (await req('GET', 'auth', '/workspaces', { token: login.accessToken })).find(w => w.name === 'Nexa Studio');
const refreshed = await req('POST', 'auth', '/auth/refresh', { body: { refreshToken: login.refreshToken, workspaceId: ws.id } });
const token = refreshed.accessToken;
const members = await req('GET', 'auth', `/workspaces/${ws.id}/members`, { token });
const zalifa = members.find(m => m.email === 'zalifa.mohamed@nexa.io');
const folders = await req('GET', 'ged', '/ged/folders', { token });
const contrats = folders.find(f => f.name === 'Contrats & Légal');
console.log('ws', ws.id, '| dossier Contrats & Légal', contrats?.id, '| zalifa', zalifa?.userId);

async function importOne(src, name, access, grantId) {
  const stored = await upload(token, resolve(src), ws.id);
  const file = await req('POST', 'ged', '/ged/files', { token, body: {
    folderId: contrats.id, projectId: null, name, fileUrl: stored.downloadUrl,
    fileSize: stored.size, contentType: stored.contentType, sourceFileId: stored.id,
    accessMode: access === 'PRIVATE' ? 'PRIVATE' : (access === 'SHARED' ? 'OPEN' : 'OPEN'),
  } });
  if (access === 'SHARED') {
    await req('PATCH', 'ged', `/ged/files/${file.id}/access`, { token, body: { accessMode: 'SHARED' } }).catch(e => console.log('  access:', e.message));
    if (grantId) await req('POST', 'ged', '/ged/grants', { token, body: { targetType: 'FILE', targetId: file.id, granteeType: 'USER', granteeId: grantId, accessLevel: 'READER' } }).catch(e => console.log('  grant:', e.message));
  }
  console.log('✅ importé :', name);
}

await importOne('ATTESTATION HEBERGEMENT.pdf', 'Attestation d’hébergement.pdf', 'PRIVATE');
await importOne('Pour préparer Examen DES1_DES2_DES3 ORL_25 mars 2026_pour les réponses.xlsx', 'Budget prévisionnel 2026.xlsx', 'SHARED', zalifa?.userId);
console.log('Terminé.');
