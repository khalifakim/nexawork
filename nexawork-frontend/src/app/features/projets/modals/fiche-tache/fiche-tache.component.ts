import {
  ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges,
  Output, ViewChild, computed, effect, inject, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CommentComposerComponent } from '@shared/ui/comment-composer/comment-composer.component';
import { MentionChipComponent, MentionChipEvent } from '@shared/ui/mention-chip/mention-chip.component';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { TaskCard, TaskComment, AttachedRef } from '@core/models/task.models';
import { chipTabFor as chipTabForUtil, parseRichText, RichPart } from '@core/util/mention.util';
import { avatarColorFor } from '@core/util/ui.util';
import { TasksService } from '@core/services/tasks.service';
import { SessionService } from '@core/services/session.service';
import { FilesHttpService } from '@core/http/files.http.service';
import { ToastService } from '@core/services/toast.service';

/** Vue d'affichage d'une sous-tâche. */
interface SubRow { id: string; title: string; done: boolean; }

/** Vue d'affichage d'un commentaire (contenu parsé en parts + fichiers). */
interface CommentRow {
  id: string;
  author: string; color: string; time: string;
  parts: RichPart[];
  files: AttachedRef[];
  mine: boolean;
}

/** Fiche de tâche — modal unique (détail + commentaires), branchée au backend. */
@Component({
  selector: 'app-fiche-tache',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CommentComposerComponent, MentionChipComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
       @if (loading) {
         <div class="loading">
           <span class="loading__spin"></span>
           <span class="loading__t">Ouverture de la tâche…</span>
         </div>
       }
       <div class="modal__inner">
        <!-- LEFT -->
        <div class="left">
          <div class="lh">
            <button class="crumb" (click)="closed.emit()"><app-icon name="projects" [size]="14" />Projets</button>
            <span class="crumb__sep">/</span>
            <span class="crumb__p">{{ task.proj || 'Projet' }}</span>
            <span class="spacer"></span>
            <span class="id nx-mono">{{ task.taskKey }}</span>
            <span class="created">Créée le {{ fmtDate(task.createdDate) }}</span>
            @if (!readonly) {
              <button class="del" (click)="deleteTask()"><app-icon name="trash" [size]="14" />Supprimer</button>
            } @else {
              <span class="ro"><app-icon name="lock" [size]="12" />Lecture seule</span>
            }
          </div>

          <div class="lbody">
            <input class="title" [value]="task.title" [readonly]="readonly"
                   (blur)="saveTitle($any($event.target).value)" />

            <div class="fields">
              <div class="frow"><span class="fl"><app-icon name="taskCheck" [size]="16" />Statut</span>
                <span class="status" [style.color]="task.tag[1]" [style.background]="statusBg()"><span class="sdot" [style.background]="task.tag[1]"></span>{{ task.tag[0] }}</span></div>
              <div class="frow"><span class="fl"><app-icon name="user" [size]="16" />Assignés</span>
                @if (task.assigneeId) {
                  <span class="assignee"><span class="av" [style.background]="assigneeColor()">{{ assigneeInitials() }}</span>{{ assigneeLabel() }}</span>
                } @else {
                  <span class="fv fv--muted">Non assigné</span>
                }
              </div>
              <div class="frow"><span class="fl"><app-icon name="calendar" [size]="16" />Date de début</span><span class="fv" [class.fv--muted]="!task.startDate">{{ task.startDate ? fmtDate(task.startDate) : 'Non définie' }}</span></div>
              <div class="frow"><span class="fl"><app-icon name="calendar" [size]="16" />Date de fin</span><span class="fv" [class.fv--muted]="!task.dueDate">{{ task.dueDate ? fmtDate(task.dueDate) : 'Non définie' }}</span></div>
              <div class="frow"><span class="fl"><app-icon name="flag" [size]="16" />Priorité</span>
                <span class="prio" [style.color]="task.prio[1]"><span class="pdot" [style.background]="task.prio[1]"></span>{{ task.prio[0] }}</span></div>
              <div class="frow"><span class="fl"><app-icon name="clockEst" [size]="16" />Temps estimé</span><span class="fv" [class.fv--muted]="!task.estimate">{{ task.estimate || 'Non défini' }}</span></div>
            </div>

            <div class="sep"></div>

            <div class="block">
              <div class="block__t">Description</div>
              <textarea class="desc" rows="3" [readonly]="readonly"
                        [value]="task.desc" (blur)="saveDesc($any($event.target).value)"></textarea>
            </div>

            <div class="block">
              <div class="block__h"><span class="block__t">Sous-tâches</span><span class="count">{{ subtasks().length }}</span></div>
              <div class="subs">
                @for (s of subtasks(); track s.id) {
                  <div class="sub" [class.sub--done]="s.done" (click)="toggleSub(s)">
                    <span class="cb" [class.cb--on]="s.done">
                      @if (s.done) { <app-icon name="check" [size]="11" [stroke]="3" /> }
                    </span>
                    <span class="sub__n">{{ s.title }}</span>
                    @if (!readonly) {
                      <button class="sub__del" (click)="removeSub(s.id, $event)"><app-icon name="trash" [size]="15" /></button>
                    }
                  </div>
                }
              </div>
              @if (!readonly) {
                @if (adding()) {
                  <div class="addsub">
                    <span class="cb"></span>
                    <input autofocus [value]="draft()" (input)="draft.set($any($event.target).value)" (keydown.enter)="addSub()" placeholder="Nom de la sous-tâche…" />
                    <button class="addsub__ok" (click)="addSub()">Ajouter</button>
                  </div>
                } @else {
                  <button class="addbtn" (click)="adding.set(true)"><app-icon name="plus" [size]="15" />Ajouter une sous-tâche</button>
                }
              }
            </div>

            <div class="block">
              <div class="block__t">Pièces jointes</div>
              <div class="att">
                @for (a of attachments(); track a.id) {
                  <div class="att__c" (click)="download(a)">
                    <span class="att__ic" [style.background]="fileTint(a.name)">{{ fileExt(a.name) }}</span>
                    <div><div class="att__n">{{ a.name }}</div><div class="att__s">{{ sizeOf(a.size) }}</div></div>
                    @if (!readonly) {
                      <button class="att__del" title="Retirer" (click)="removeAttachment(a.id, $event)"><app-icon name="trash" [size]="14" /></button>
                    }
                  </div>
                }
              </div>
              @if (!readonly) {
                <label class="drop">
                  <app-icon name="upload" [size]="20" />Déposez vos fichiers ici ou <span class="link">parcourir</span>
                  <input type="file" hidden multiple (change)="onFilesPicked($event)" />
                </label>
              }
            </div>
          </div>
        </div>

        <!-- RIGHT : comments -->
        <div class="right">
          <div class="rh"><span class="rh__t">Commentaires</span><span class="count">{{ comments().length }}</span>
            <span class="spacer"></span><button class="x" (click)="closed.emit()"><app-icon name="x" [size]="17" /></button></div>
          <div class="thread" #threadEl>
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
                        <button class="cm__file" title="Télécharger" (click)="download(f)">
                          <app-icon name="file" [size]="13" />
                          <span class="cm__fn">{{ f.name }}</span>
                          <span class="cm__fs">{{ sizeOf(f.size) }}</span>
                          <app-icon class="cm__dl" name="download" [size]="13" />
                        </button>
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
export class FicheTacheComponent implements OnChanges {
  @Input({ required: true }) task!: TaskCard & { proj?: string };
  @Input() readonly = false;
  /** When true, shows a loading overlay over the modal (used when switching tasks via a mention). */
  @Input() loading = false;
  @Output() closed = new EventEmitter<void>();
  /** Emitted when the user clicks a `@@task` mention in a comment. */
  @Output() openTask = new EventEmitter<string>();
  /** Emitted (with the task id) after the task has been deleted from its detail. */
  @Output() deleted = new EventEmitter<string>();

  private router = inject(Router);
  protected bus = inject(ShellBus);
  private tasksSvc = inject(TasksService);
  private session = inject(SessionService);
  private filesSvc = inject(FilesHttpService);
  private toast = inject(ToastService);

  @ViewChild('threadEl') private threadEl?: ElementRef<HTMLDivElement>;

  protected subtasks = signal<SubRow[]>([]);
  protected comments = signal<CommentRow[]>([]);
  protected attachments = signal<AttachedRef[]>([]);
  adding = signal(false);
  draft = signal('');

  private loadedTaskId: string | null = null;

  statusBg = computed(() => this.tintFromColor(this.task.tag[1]));
  assigneeColor = computed(() => this.task.assigneeId ? avatarColorFor(this.task.assigneeId) : '#8E8AA0');
  assigneeLabel = computed(() => {
    const id = this.task.assigneeId;
    if (!id) return 'Non assigné';
    // Résolution du nom (annuaire des membres) = phase I3.
    return id === this.session.user()?.id ? (this.session.user()?.displayName ?? 'Moi') + ' (moi)' : 'Assigné';
  });
  assigneeInitials = computed(() => this.ini(this.assigneeLabel()));

  constructor() {
    effect(() => {
      this.comments();
      requestAnimationFrame(() => this.scrollThreadToBottom());
    });
  }

  ngOnChanges(): void {
    // Recharge le détail (sous-tâches / commentaires / PJ) au (ré)ouverture ou
    // au changement de tâche (mention → switchTask remplace `task`).
    if (this.task && this.task.id !== this.loadedTaskId) {
      this.loadedTaskId = this.task.id;
      this.reload();
    }
  }

  private reload(): void {
    const id = this.task.id;
    this.tasksSvc.subtasks(id).subscribe(list =>
      this.subtasks.set(list.map(s => ({ id: s.id, title: s.title, done: s.done }))));
    this.tasksSvc.attachments(id).subscribe(list => this.attachments.set(list));
    this.tasksSvc.comments(id).subscribe(list => this.comments.set(list.map(c => this.toRow(c))));
  }

  private toRow(c: TaskComment): CommentRow {
    const mine = c.authorUserId === this.session.user()?.id;
    return {
      id: c.id,
      author: mine ? (this.session.user()?.displayName ?? 'Moi') : 'Membre',
      color: avatarColorFor(c.authorUserId),
      time: this.fmtDateTime(c.createdAt),
      parts: parseRichText(c.content),
      files: c.attachments,
      mine,
    };
  }

  private scrollThreadToBottom(): void {
    const el = this.threadEl?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ── Édition titre / description ─────────────────────────────────────────────
  saveTitle(v: string): void {
    const title = v.trim();
    if (this.readonly || !title || title === this.task.title) return;
    this.tasksSvc.updateTask(this.task.id, { title }).subscribe(card => { this.task = { ...this.task, ...card }; });
  }
  saveDesc(v: string): void {
    if (this.readonly || v === this.task.desc) return;
    this.tasksSvc.updateTask(this.task.id, { description: v }).subscribe(card => { this.task = { ...this.task, ...card }; });
  }

  deleteTask(): void {
    if (this.readonly) return;
    this.deleted.emit(this.task.id);
  }

  // ── Sous-tâches ─────────────────────────────────────────────────────────────
  addSub(): void {
    const v = this.draft().trim();
    if (!v) { this.adding.set(false); return; }
    this.tasksSvc.addSubtask(this.task.id, v).subscribe(s => {
      this.subtasks.update(l => [...l, { id: s.id, title: s.title, done: s.done }]);
      this.draft.set('');
      this.adding.set(false);
    });
  }
  removeSub(id: string, ev: Event): void {
    ev.stopPropagation();
    const snapshot = this.subtasks();
    this.subtasks.update(l => l.filter(s => s.id !== id));
    this.tasksSvc.removeSubtask(this.task.id, id).subscribe({ error: () => this.subtasks.set(snapshot) });
  }
  toggleSub(s: SubRow): void {
    if (this.readonly) return;
    const done = !s.done;
    this.subtasks.update(l => l.map(x => x.id === s.id ? { ...x, done } : x));
    this.tasksSvc.setSubtaskDone(this.task.id, s.id, done)
      .subscribe({ error: () => this.subtasks.update(l => l.map(x => x.id === s.id ? { ...x, done: !done } : x)) });
  }

  // ── Pièces jointes de la tâche ──────────────────────────────────────────────
  onFilesPicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const file of files) {
      this.tasksSvc.addAttachment(this.task.id, this.task.projectId, file)
        .subscribe(a => this.attachments.update(l => [...l, a]));
    }
  }
  removeAttachment(id: string, ev: Event): void {
    ev.stopPropagation();
    const snapshot = this.attachments();
    this.attachments.update(l => l.filter(a => a.id !== id));
    this.tasksSvc.removeAttachment(this.task.id, id).subscribe({ error: () => this.attachments.set(snapshot) });
  }

  // ── Commentaires ────────────────────────────────────────────────────────────
  onNewComment(payload: { parts: RichPart[]; files: { file?: File }[]; text: string }): void {
    const files = payload.files.map(f => f.file).filter((f): f is File => !!f);
    this.tasksSvc.addComment(this.task.id, this.task.projectId, payload.text, files)
      .subscribe(c => this.comments.update(list => [...list, this.toRow(c)]));
  }
  removeComment(id: string): void {
    const snapshot = this.comments();
    this.comments.update(list => list.filter(c => c.id !== id));
    this.tasksSvc.removeComment(this.task.id, id).subscribe({ error: () => this.comments.set(snapshot) });
  }

  download(f: AttachedRef): void {
    if (!f.url || f.url === '#') return;
    this.filesSvc.download(f.url).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = f.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

  sizeOf(bytes?: number): string {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1).replace('.0', '') + ' Mo';
  }

  fmtDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  fmtDateTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' +
           d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  fileExt(name: string): string {
    const ext = name.split('.').pop() ?? '';
    return ext.slice(0, 3).toUpperCase() || 'FIC';
  }
  fileTint(name: string): string { return avatarColorFor(this.fileExt(name)); }

  private tintFromColor(hex: string): string {
    const m = /^#([0-9a-f]{6})$/i.exec(hex ?? '');
    if (!m) return 'rgba(0,0,0,.06)';
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, .16)`;
  }

  chipTabFor(type: 'person' | 'task' | 'doc' | 'channel'): 'personnes' | 'taches' | 'documents' | 'canaux' {
    return chipTabForUtil(type);
  }

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
