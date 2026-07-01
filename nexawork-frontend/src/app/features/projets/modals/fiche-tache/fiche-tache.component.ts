import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { TaskCard } from '@core/models/task.models';

interface Comment { author: string; color: string; time: string; text: string; mine?: boolean; }

/** Fiche de tâche — modal unique (détail + commentaires), fidèle au prototype. */
@Component({
  selector: 'app-fiche-tache',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
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
                @for (s of subtasks(); track s; let i = $index) {
                  <div class="sub">
                    <span class="cb"></span>
                    <span class="sub__id nx-mono">{{ task.id }}-{{ i + 1 }}</span>
                    <span class="sub__n">{{ s }}</span>
                    <span class="av av--sm" style="background:#6C70F0"></span>
                    <button class="sub__del" (click)="removeSub(i)"><app-icon name="trash" [size]="15" /></button>
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
          <div class="rh"><span class="rh__t">Commentaires</span><span class="count">{{ comments.length }}</span>
            <span class="spacer"></span><button class="x" (click)="closed.emit()"><app-icon name="x" [size]="17" /></button></div>
          <div class="thread">
            @for (c of comments; track $index) {
              <div class="cm">
                <span class="av" [style.background]="c.color">{{ ini(c.author) }}</span>
                <div class="cm__b">
                  <div class="cm__h"><span class="cm__n">{{ c.author }}</span><span class="cm__t">{{ c.time }}</span></div>
                  <div class="cm__x">{{ c.text }}</div>
                </div>
              </div>
            }
          </div>
          @if (!readonly) {
            <div class="composer">
              <div class="composer__box">
                <div class="composer__in" contenteditable="true" data-ph="Commentez, mentionnez avec @, @@, @@@ ou #…"></div>
                <div class="composer__bar">
                  <button class="cbtn"><app-icon name="paperclip" [size]="18" /></button>
                  <button class="cbtn"><app-icon name="at" [size]="18" /></button>
                  <button class="cbtn"><app-icon name="smile" [size]="18" /></button>
                  <span class="spacer"></span>
                  <button class="send"><app-icon name="send" [size]="17" /></button>
                </div>
              </div>
            </div>
          }
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

  status = { name: 'En cours', color: '#5B8DEF', bg: 'rgba(91,141,239,.16)' };
  adding = signal(false);
  draft = signal('');
  subtasks = signal<string[]>(['Préparer les variantes de l’écran']);

  comments: Comment[] = [
    { author: 'Sarah Diallo', color: '#F2693C', time: '16 juin · 09:30', text: '@Akim peux-tu valider la maquette du profil avant ce soir ?' },
    { author: 'Moussa Bâ', color: '#6C70F0', time: '16 juin · 11:05', text: 'J’ai poussé les composants liés à cette tâche, RAS de mon côté.' },
    { author: 'Akim Koné', color: '#F5A623', time: '16 juin · 11:24', mine: true, text: 'Parfait, je relis ça cet après-midi et je valide le statut.' },
  ];

  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }
  addSub(): void { const v = this.draft().trim(); if (v) this.subtasks.update(l => [...l, v]); this.draft.set(''); this.adding.set(false); }
  removeSub(i: number): void { this.subtasks.update(l => l.filter((_, idx) => idx !== i)); }
}
