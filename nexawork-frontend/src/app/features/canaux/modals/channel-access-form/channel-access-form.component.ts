import {
  ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, Output,
  computed, inject, signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ChannelAccessMode, ChannelGrant } from '@core/models/channel.models';
import { MembersService } from '@core/services/members.service';
import { ProjectsService } from '@core/services/projects.service';
import { ProjectTeam } from '@core/models/project.models';
import { Member } from '@core/models/member.models';
import { avatarColorFor } from '@core/util/ui.util';

/** Un bénéficiaire sélectionnable — `id` = userId ou teamId réel. */
interface Person { type: 'user' | 'team'; id: string; name: string; color: string; }

/**
 * Visibility block reused by « Nouveau canal » and « Gérer les accès ». Matches
 * the prototype's `channelAccessOptions`: two radios (public / private) + a
 * people-picker with a grant list when the channel is private.
 */
@Component({
  selector: 'app-channel-access-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button type="button" class="opt" [class.opt--on]="mode==='open'" (click)="setMode('open')">
      <span class="radio" [class.radio--on]="mode==='open'"></span>
      <span class="opt__i"><app-icon name="user" [size]="17" /></span>
      <span class="opt__tx">
        <span class="opt__t">Canal public</span>
        <span class="opt__d">{{ publicDesc }} (par défaut)</span>
      </span>
    </button>
    <button type="button" class="opt" [class.opt--on]="mode==='private'" (click)="setMode('private')">
      <span class="radio" [class.radio--on]="mode==='private'"></span>
      <span class="opt__i"><app-icon name="lock" [size]="17" /></span>
      <span class="opt__tx">
        <span class="opt__t">Canal privé</span>
        <span class="opt__d">Accessible uniquement aux personnes que vous choisissez.</span>
      </span>
    </button>

    @if (mode === 'private') {
      <div class="shared">
        <div class="picker">
          <div class="picker__in" [class.picker__in--on]="pickerOpen()">
            <app-icon name="search" [size]="16" />
            <input [value]="query()"
                   (focus)="pickerOpen.set(true)"
                   (input)="onQuery($any($event.target).value)"
                   placeholder="Ajouter une personne ou une équipe…" />
          </div>
          @if (pickerOpen()) {
            <div class="picker__dd">
              @for (p of suggestions(); track p.type + ':' + p.id) {
                <button type="button" class="picker__row" (click)="add(p)">
                  <span class="chip" [class.chip--team]="p.type==='team'" [style.background]="p.color">{{ p.name[0] }}</span>
                  <span class="picker__n">{{ p.name }}</span>
                  <span class="picker__ty">{{ p.type === 'team' ? 'Équipe' : 'Membre' }}</span>
                </button>
              } @empty {
                <div class="picker__empty">Aucun résultat</div>
              }
            </div>
          }
        </div>

        @if (grants.length) {
          <div class="grants">
            @for (g of grants; track g.type + ':' + g.id) {
              <div class="grant">
                <span class="chip" [class.chip--team]="g.type==='team'" [style.background]="colorOf(g)">{{ g.name[0] }}</span>
                <div class="grant__tx">
                  <div class="grant__n">{{ g.name }}</div>
                  <div class="grant__r">{{ g.type === 'team' ? 'Équipe' : 'Membre' }}</div>
                </div>
                <button type="button" class="grant__rm" (click)="remove(g)"><app-icon name="x" [size]="15" /></button>
              </div>
            }
          </div>
        } @else {
          <div class="grants__empty">Personne ajoutée pour l'instant.</div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .opt { display: flex; align-items: flex-start; gap: 11px; text-align: left; width: 100%; box-sizing: border-box; padding: 12px 13px; border: 1px solid #E2DFD8; border-radius: 11px; background: #fff; cursor: pointer; font-family: inherit; margin-bottom: 8px; }
    .opt--on { border-color: var(--nx-indigo); background: rgba(91,95,233,.05); }
    .radio { width: 18px; height: 18px; flex: none; margin-top: 1px; border-radius: 50%; border: 2px solid #cfccc4; display: flex; align-items: center; justify-content: center; }
    .radio--on { border-color: var(--nx-indigo); }
    .radio--on::after { content: ''; width: 9px; height: 9px; border-radius: 50%; background: var(--nx-indigo); }
    .opt__i { display: flex; flex: none; margin-top: 1px; color: #7a7682; }
    .opt__tx { flex: 1; min-width: 0; }
    .opt__t { display: block; font-size: 13.5px; font-weight: 600; color: var(--nx-text); }
    .opt__d { display: block; font-size: 12px; color: var(--nx-text-500); margin-top: 2px; line-height: 1.4; }

    .shared { margin-top: 4px; padding-top: 12px; border-top: 1px solid #F0EEE9; }
    .picker { position: relative; margin-bottom: 10px; }
    .picker__in { display: flex; align-items: center; gap: 9px; height: 40px; padding: 0 12px; background: #fff; border: 1px solid #DDD9D1; border-radius: 10px; color: var(--nx-text-400); }
    .picker__in--on { border-color: var(--nx-indigo); }
    .picker__in input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: var(--nx-text); }
    .picker__dd { position: absolute; top: 46px; left: 0; right: 0; z-index: 30; background: #fff; border-radius: 11px; border: 1px solid #ECEAE4; box-shadow: 0 14px 38px rgba(20,15,40,.18); padding: 7px; max-height: 230px; overflow-y: auto; overscroll-behavior: contain; }
    .picker__row { width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 8px 9px; border: none; border-radius: 8px; background: transparent; cursor: pointer; font-family: inherit; text-align: left; }
    .picker__row:hover { background: var(--nx-surface-2); }
    .picker__n { flex: 1; font-size: 13.5px; font-weight: 600; color: var(--nx-text); }
    .picker__ty { font-size: 11px; font-weight: 600; color: var(--nx-text-400); text-transform: uppercase; letter-spacing: .04em; }
    .picker__empty { padding: 14px; text-align: center; font-size: 12.5px; color: var(--nx-text-400); }
    .chip { width: 30px; height: 30px; flex: none; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .chip--team { border-radius: 7px; }
    .grants { display: flex; flex-direction: column; gap: 4px; }
    .grants__empty { font-size: 12.5px; color: var(--nx-text-400); padding: 10px 2px; }
    .grant { display: flex; align-items: center; gap: 10px; padding: 7px 6px; }
    .grant__tx { flex: 1; min-width: 0; }
    .grant__n { font-size: 13.5px; font-weight: 600; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .grant__r { font-size: 11.5px; color: var(--nx-text-400); }
    .grant__rm { width: 30px; height: 30px; flex: none; border: none; border-radius: 7px; background: transparent; color: var(--nx-text-300); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .grant__rm:hover { background: #FDECEB; color: var(--nx-danger); }
  `],
})
export class ChannelAccessFormComponent {
  @Input() mode: ChannelAccessMode = 'open';
  @Input() grants: ChannelGrant[] = [];
  @Input() scope: 'org' | 'project' = 'org';
  /** Projet propriétaire (canal de projet) — ses équipes deviennent sélectionnables. */
  @Input() set projectId(v: string | undefined) { this._projectId.set(v ?? null); }

  @Output() modeChange = new EventEmitter<ChannelAccessMode>();
  @Output() grantsChange = new EventEmitter<ChannelGrant[]>();

  private host: ElementRef<HTMLElement> = inject(ElementRef);
  private membersSvc = inject(MembersService);
  private projectsSvc = inject(ProjectsService);

  query = signal('');
  pickerOpen = signal(false);
  private _projectId = signal<string | null>(null);

  /** Membres réels de l'espace (la liste était codée en dur). */
  private directory = toSignal(this.membersSvc.directory(), { initialValue: [] as Member[] });
  /** Équipes réelles du projet — il n'y a pas d'équipe hors projet. */
  private teams = toSignal(
    toObservable(this._projectId).pipe(
      switchMap(id => (id ? this.projectsSvc.teams(id) : of([] as ProjectTeam[]))),
    ),
    { initialValue: [] as ProjectTeam[] },
  );

  private pool = computed<Person[]>(() => [
    ...this.teams().map(t => ({
      type: 'team' as const, id: t.id, name: t.name, color: t.color ?? avatarColorFor(t.id),
    })),
    ...this.directory()
      .filter(m => !!m.userId)
      .map(m => ({
        type: 'user' as const, id: m.userId!, name: m.name, color: m.color ?? avatarColorFor(m.userId!),
      })),
  ]);

  /** Ferme le picker au clic hors du bloc (le backdrop `fixed` capturait la molette). */
  @HostListener('document:mousedown', ['$event'])
  onDocMouseDown(ev: MouseEvent): void {
    if (!this.pickerOpen()) return;
    if (!this.host.nativeElement.contains(ev.target as Node)) {
      this.pickerOpen.set(false);
    }
  }

  get publicDesc(): string {
    return this.scope === 'org'
      ? "Accessible à tous les membres de l'espace de travail."
      : 'Accessible à tous les membres du projet.';
  }

  suggestions = computed<Person[]>(() => {
    const q = this.query().toLowerCase().trim();
    const taken = new Set(this.grants.map(g => g.type + ':' + g.id));
    return this.pool().filter(p => !taken.has(p.type + ':' + p.id) && p.name.toLowerCase().includes(q));
  });

  colorOf(g: ChannelGrant): string {
    return this.pool().find(p => p.type === g.type && p.id === g.id)?.color ?? avatarColorFor(g.id);
  }

  setMode(m: ChannelAccessMode): void {
    this.mode = m;
    this.modeChange.emit(m);
  }

  onQuery(v: string): void { this.query.set(v); this.pickerOpen.set(true); }

  add(p: Person): void {
    const next: ChannelGrant[] = [...this.grants, { type: p.type, id: p.id, name: p.name }];
    this.grants = next;
    this.grantsChange.emit(next);
    // UX: reset la saisie ET fermeture du popup après une sélection.
    this.query.set('');
    this.pickerOpen.set(false);
  }

  remove(g: ChannelGrant): void {
    const next = this.grants.filter(x => !(x.id === g.id && x.type === g.type));
    this.grants = next;
    this.grantsChange.emit(next);
  }
}
