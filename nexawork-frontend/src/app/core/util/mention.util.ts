import { MentionTab } from '@core/models/mention.models';

/** A renderable piece of a comment/message: plain text or a mention token. */
export interface RichPart { type: 't' | 'person' | 'task' | 'doc' | 'channel'; val: string; }

/** Like RichPart but keeps the raw token (prefix + value) — used by the live editor. */
export interface RichToken { type: 't' | 'person' | 'task' | 'doc' | 'channel'; raw: string; val: string; }

/*
 * Token grammar (a mention never contains a normal space, but MAY contain a
 * non-breaking space ` ` so multi-word picks like "Moussa Bâ" or
 * "Specs fonctionnelles.pdf" stay a single token):
 *   @@@doc   #channel   @@task   @person
 * Longest prefixes first so `@@`/`@@@` win over `@`.
 */
const WORD = '[A-Za-z0-9À-ÿ._\\u00A0\\-]';
const NS   = '[^ \\t\\n\\r\\f\\v]';                     // any char except real whitespace (keeps  )
const MENTION_RE = new RegExp(`@@@${NS}+|@@${WORD}+|#${WORD}+|@[A-Za-zÀ-ÿ]${WORD}*`, 'g');

/** Normalise a token value for display (NBSP → regular space). */
function display(val: string): string { return val.replace(/ /g, ' '); }

/** Low-level tokenizer that keeps the raw token — shared by the live editor and parseRichText. */
export function tokenizeRich(text: string): RichToken[] {
  const out: RichToken[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ type: 't', raw: text.slice(last, start), val: text.slice(last, start) });
    const tok = m[0];
    if (tok.startsWith('@@@'))     out.push({ type: 'doc',     raw: tok, val: display(tok.slice(3)) });
    else if (tok.startsWith('@@')) out.push({ type: 'task',    raw: tok, val: display(tok.slice(2)) });
    else if (tok.startsWith('#'))  out.push({ type: 'channel', raw: tok, val: display(tok.slice(1)) });
    else                            out.push({ type: 'person',  raw: tok, val: display(tok.slice(1)) });
    last = start + tok.length;
  }
  if (last < text.length) out.push({ type: 't', raw: text.slice(last), val: text.slice(last) });
  return out;
}

/**
 * Split a comment/message string into renderable parts. Mention tokens
 * (`@person`, `@@task`, `@@@doc`, `#channel`) become chip parts; everything
 * else is plain text. Shared by fiche-tâche, canaux and conversations so the
 * mention behaviour is identical everywhere (matches the prototype).
 */
export function parseRichText(text: string): RichPart[] {
  return tokenizeRich(text).map(t => ({ type: t.type, val: t.val }));
}

/** Maps a parsed part type to the MentionTab used by <app-mention-chip>. */
export function chipTabFor(type: 'person' | 'task' | 'doc' | 'channel'): MentionTab {
  return ({ person: 'personnes', task: 'taches', doc: 'documents', channel: 'canaux' } as const)[type];
}
