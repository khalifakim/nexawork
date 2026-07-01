import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CommentComposerComponent } from '@shared/ui/comment-composer/comment-composer.component';
import { MentionChipComponent, MentionChipEvent } from '@shared/ui/mention-chip/mention-chip.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { TaskCard } from '@core/models/task.models';

interface SubTask { id: string; title: string; done: boolean; }

interface CommentPart { type: 't' | 'person' | 'task' | 'doc' | 'channel'; val: string; }

interface AttachedFile { id: number; name: string; size: number; }

/** Unique id so we can track / delete a comment in the list. */
interface Comment {
  id: number;
  author: string; color: string; time: string;
  parts: CommentPart[];
  files: AttachedFile[];
  mine?: boolean;
}

/** Split a comment text into renderable parts (mention tokens become chips). */
function parseComment(text: string): CommentPart[] {
  const out: CommentPart[] = [];
  const re = /(@@[A-Za-z0-9._-]+|@@@[^\s]+|@[A-Za-zÀ-ÿ][A-Za-z0-9À-ÿ ._-]*|#[\w-]+)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ type: 't', val: text.slice(last, start) });
    const tok = m[0];
    if (tok.startsWith('@@@'))      out.push({ type: 'doc',     val: tok.slice(3) });
    else if (tok.startsWith('@@'))   out.push({ type: 'task',    val: tok.slice(2) });
    else if (tok.startsWith('#'))    out.push({ type: 'channel', val: tok.slice(1) });
    else                              out.push({ type: 'person',  val: tok.slice(1) });
    last = start + tok.length;
  }
  if (last < text.length) out.push({ type: 't', val: text.slice(last) });
  return out;
}

/** Fiche de tâche — modal unique (détail + commentaires), fidèle au prototype. */
@Component({
  selector: 'app-fiche-tache',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CommentComposerComponent, MentionChipComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
       <div class="modal__inner">
        <!-- LEFT -->
        <div class="left">
          <div class="lh">
            <button class="crumb" (click)="closed.emit()"><app-icon name="projects" [size]="14" />Projets</button>
            <span class="crumb__sep">/</span>
            <span class="crumb__p">{{ task.proj || 'Refonte App Mobile' }}</span>
            <span class="spacer"></span>
            <span class="id nx-mono">{{ task.id }}</span>
            <span class="created">Créée le 11 sept. 2025</span>
            @if (!readonly) {
              <button class="del" (click)="closed.emit()"><app-icon name="trash" [size]="14" />Supprimer</button>
            } @else {
              <span class="ro"><app-icon name="lock" [size]="12" />Lecture seule</span>
            }
          </div>

          <div class="lbody">
            <input class="title" [value]="task.title" />

            <div class="fields">
              <div class="frow"><span class="fl"><app-icon name="taskCheck" [size]="16" />Statut</span>
                <span class="status" [style.color]="status.color" [style.background]="status.bg"><span class="sdot" [style.background]="status.color"></span>{{ status.name }}</span></div>
              <div class="frow"><span class="fl"><app-icon name="user" [size]="16" />Assignés</span>
                <span class="assignee"><span class="av" style="background:#F5A623">AK</span>Akim Koné (moi)</span></div>
              <div class="frow"><span class="fl"><app-icon name="calendar" [size]="16" />Date de début</span><span class="fv">15 sept. 2025</span></div>
              <div class="frow"><span class="fl"><app-icon name="calendar" [size]="16" />Date de fin</span><span class="fv">{{ task.due || '30 sept. 2025' }}</span></div>
              <div class="frow"><span class="fl"><app-icon name="flag" [size]="16" />Priorité</span>
                <span class="prio" [style.color]="task.prio[1]"><span class="pdot" [style.background]="task.prio[1]"></span>{{ task.prio[0] }}</span></div>
              <div class="frow"><span class="fl"><app-icon name="clockEst" [size]="16" />Temps estimé</span><span class="fv fv--muted">Ajouter</span></div>
            </div>

            <div class="sep"></div>

            <div class="block">
              <div class="block__t">Description</div>
              <textarea class="desc" rows="3">{{ task.desc }}</textarea>
            </div>

            <div class="block">
              <div class="block__h"><span class="block__t">Sous-tâches</span><span class="count">{{ subtasks().length }}</span></div>
              <div class="subs">
                @for (s of subtasks(); track s.id) {
                  <div class="sub" [class.sub--done]="s.done" (click)="toggleSub(s.id)">
                    <span class="cb" [class.cb--on]="s.done">
                      @if (s.done) { <app-icon name="check" [size]="11" [stroke]="3" /> }
                    </span>
                    <span class="sub__id nx-mono">{{ s.id }}</span>
                    <span class="sub__n">{{ s.title }}</span>
                    <span class="av av--sm" style="background:#6C70F0"></span>
                    <button class="sub__del" (click)="removeSub(s.id, $event)"><app-icon name="trash" [size]="15" /></button>
                  </div>
                }
              </div>
              @if (adding()) {
                <div class="addsub">
                  <span class="cb"></span>
                  <input autofocus [value]="draft()" (input)="draft.set($any($event.target).value)" (keydown.enter)="addSub()" placeholder="Nom de la sous-tâche…" />
                  <button class="addsub__ok" (click)="addSub()">Ajouter</button>
                </div>
              } @else {
                <button class="addbtn" (click)="adding.set(true)"><app-icon name="plus" [size]="15" />Ajouter une sous-tâche</button>
              }
            </div>

            <div class="block">
              <div class="block__t">Pièces jointes</div>
              <div class="att">
                <div class="att__c"><span class="att__ic" style="background:#E0497B">FIG</span><div><div class="att__n">Maquette-profil-v3.fig</div><div class="att__s">4,2 Mo</div></div></div>
                <div class="att__c"><span class="att__ic" style="background:#F5564E">PDF</span><div><div class="att__n">Specs-ecran-profil.pdf</div><div class="att__s">880 Ko</div></div></div>
              </div>
              <div class="drop"><app-icon name="upload" [size]="20" />Déposez vos fichiers ici ou <span class="link">parcourir</span></div>
            </div>
          </div>
        </div>

        <!-- RIGHT : comments -->
        <div class="right">
          <div class="rh"><span class="rh__t">Commentaires</span><span class="count">{{ comments().length }}</span>
            <span class="spacer"></span><button class="x" (click)="closed.emit()"><app-icon name="x" [size]="17" /></button></div>
          <div class="thread">
            @for (c of comments(); track c.id) {
              <div class="cm" [class.cm--mine]="c.mine">
                <span class="av" [style.background]="c.color">{{ ini(c.author) }}</span>
                <div class="cm__b">
                  <div class="cm__h">
                    <span class="cm__n">{{ c.author }}</span>
                    <span class="cm__t">{{ c.time }}</span>
                    <span class="spacer"></span>
                    @if (c.mine && !readonly) {
                      <button class="cm__del" title="Supprimer" (click)="removeComment(c.id)">
                        <app-icon name="trash" [size]="13" [stroke]="2.2" />
                      </button>
                    }
                  </div>
                  <div class="cm__x">
                    @for (p of c.parts; track $index) {
                      @if (p.type === 't') { <span>{{ p.val }}</span> }
                      @else {
                        <app-mention-chip
                          [tab]="chipTabFor(p.type)"
                          [value]="p.val"
                          (opened)="onChipOpen($event)"
                        />
                      }
                    }
                  </div>
                  @if (c.files.length > 0) {
                    <div class="cm__files">
                      @for (f of c.files; track f.id) {
                        <span class="cm__file">
                          <app-icon name="file" [size]="13" />
                          <span class="cm__fn">{{ f.name }}</span>
                          <span class="cm__fs">{{ sizeOf(f.size) }}</span>
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
          @if (!readonly) {
            <div class="composer">
              <app-comment-composer
                [placeholder]="'Commentez, mentionnez avec @, @@, @@@ ou #…'"
                (submitted)="onNewComment($event)"
              />
            </div>
          }
        </div>
       </div>
      </div>
    </div>
  `,
  styleUrl: './fiche-tache.component.scss',
})
export class FicheTacheComponent {
  @Input({ required: true }) task!: TaskCard & { proj?: string; due?: string };
  @Input() readonly = false;
  @Output() closed = new EventEmitter<void>();
  /** Emitted when the user clicks a `@@task` mention in a comment. */
  @Output() openTask = new EventEmitter<string>();

  private router = inject(Router);
  private bus = inject(ShellBus);

  status = { name: 'En cours', color: '#5B8DEF', bg: 'rgba(91,141,239,.16)' };
  adding = signal(false);
  draft = signal('');

  protected subtasks = signal<SubTask[]>([
    { id: 'MOB-094-1', title: 'Préparer les variantes de l’écran', done: false },
  ]);

  protected comments = signal<Comment[]>([
    { id: 1, author: 'Sarah Diallo', color: '#F2693C', time: '16 juin · 09:30',
      parts: parseComment('@Akim peux-tu valider la maquette du profil avant ce soir ?'), files: [] },
    { id: 2, author: 'Moussa Bâ', color: '#6C70F0', time: '16 juin · 11:05',
      parts: parseComment('J’ai poussé les composants liés à @@MOB-094, RAS de mon côté. Specs dans @@@Specs fonctionnelles.pdf.'),
      files: [{ id: 101, name: 'Specs-ecran-profil.pdf', size: 880 * 1024 }] },
    { id: 3, author: 'Akim Koné', color: '#F5A623', time: '16 juin · 11:24', mine: true,
      parts: parseComment('Parfait, je relis ça cet après-midi et je valide le statut. 👍'), files: [] },
  ]);

  private nextCommentId = 4;

  protected readonly completedSubtasks = computed(() => this.subtasks().filter(s => s.done).length);

  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }

  /** Human-readable file size (Ko / Mo). */
  sizeOf(bytes: number): string {
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1).replace('.0', '') + ' Mo';
  }

  /** Maps a parsed comment part to the corresponding MentionTab. */
  chipTabFor(type: 'person' | 'task' | 'doc' | 'channel'): 'personnes' | 'taches' | 'documents' | 'canaux' {
    return ({ person: 'personnes', task: 'taches', doc: 'documents', channel: 'canaux' } as const)[type];
  }

  addSub(): void {
    const v = this.draft().trim();
    if (!v) { this.adding.set(false); return; }
    const id = this.task.id + '-' + (this.subtasks().length + 1);
    this.subtasks.update(l => [...l, { id, title: v, done: false }]);
    this.draft.set('');
    this.adding.set(false);
  }

  removeSub(id: string, ev: Event): void {
    ev.stopPropagation();
    this.subtasks.update(l => l.filter(s => s.id !== id));
  }

  toggleSub(id: string): void {
    this.subtasks.update(l => l.map(s => s.id === id ? { ...s, done: !s.done } : s));
  }

  onNewComment(payload: { text: string; files: AttachedFile[] }): void {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const date = '16 juin · ' + hh + ':' + mm;
    this.comments.update(list => [
      ...list,
      { id: this.nextCommentId++, author: 'Akim Koné', color: '#F5A623', time: date,
        parts: parseComment(payload.text), files: payload.files, mine: true },
    ]);
  }

  /** Delete one of my own comments. The trash button is only shown when `mine`, so this is always a self-delete. */
  removeComment(id: number): void {
    this.comments.update(list => list.filter(c => c.id !== id));
  }

  /** Routes chip clicks to the right preview (or navigation for channels). */
  onChipOpen(ev: MentionChipEvent): void {
    switch (ev.type) {
      case 'person':   this.bus.openProfile(ev.name); break;
      case 'document': this.bus.openDocument(ev.name); break;
      case 'task':     this.openTask.emit(ev.id); break;
      case 'channel':
        this.closed.emit();
        this.router.navigate(['/app/canaux', ev.slug]);
        break;
    }
  }
}
