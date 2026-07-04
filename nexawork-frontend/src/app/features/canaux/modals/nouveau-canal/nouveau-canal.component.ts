import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ChannelAccessFormComponent } from '@features/canaux/modals/channel-access-form/channel-access-form.component';
import { ChannelsService } from '@core/services/channels.service';
import { ToastService } from '@core/services/toast.service';
import { ChannelAccessMode, ChannelGrant } from '@core/models/channel.models';

/** « Nouveau canal » — icon picker + name + readonly toggle + visibility form. */
@Component({
  selector: 'app-nouveau-canal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent, ChannelAccessFormComponent],
  template: `
    <app-modal-shell title="Nouveau canal"
                     [subtitle]="scope === 'org' ? 'Canal organisation' : 'Canal · ' + project"
                     [width]="500" (closed)="closed.emit()">
      <div class="ipick">
        <span class="ipick__l">Icône du canal</span>
        <div class="ipick__b">
          <button type="button" class="ipick__sw" [class.ipick__sw--on]="kind()==='hash'" title="Dièse" (click)="kind.set('hash')">
            <app-icon name="hash" [size]="17" />
          </button>
          <button type="button" class="ipick__sw" [class.ipick__sw--on]="kind()==='bell'" title="Cloche" (click)="kind.set('bell')">
            <app-icon name="bell" [size]="17" />
          </button>
        </div>
      </div>

      <label class="lbl">Nom du canal</label>
      <input class="in" autofocus placeholder="ex. lancement-produit"
             [value]="raw()" (input)="raw.set($any($event.target).value)"
             (keydown.enter)="create()" />

      <div class="ro" [class.ro--on]="readonly()">
        <span class="ro__ic"><app-icon name="lock" [size]="16" /></span>
        <div class="ro__t">
          <div class="ro__title">Canal en lecture seule</div>
          <div class="ro__desc">{{ roDesc }}</div>
        </div>
        <button type="button" class="sw" [class.sw--on]="readonly()" (click)="readonly.set(!readonly())">
          <span class="knob"></span>
        </button>
      </div>

      <div class="vis">
        <div class="vis__t">Visibilité du canal</div>
        <app-channel-access-form
          [mode]="mode()"
          [grants]="grants()"
          [scope]="scope"
          (modeChange)="mode.set($event)"
          (grantsChange)="grants.set($event)" />
      </div>

      <div class="note"><app-icon name="info" [size]="14" /><span>{{ noteText }}</span></div>

      <div footer>
        <button class="ghost" (click)="closed.emit()">Annuler</button>
        <button class="primary" [disabled]="!name()" (click)="create()">Créer le canal</button>
      </div>
    </app-modal-shell>
  `,
  styles: [`
    .ipick { display: flex; align-items: center; gap: 11px; margin-bottom: 16px; }
    .ipick__l { font-size: 12px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--nx-text-400); }
    .ipick__b { display: flex; gap: 7px; }
    .ipick__sw { width: 42px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 9px; border: 1px solid #E2DFD8; background: #fff; color: var(--nx-text-400); cursor: pointer; padding: 0; }
    .ipick__sw--on { border-color: var(--nx-indigo); background: rgba(91,95,233,.06); color: var(--nx-indigo); }

    .lbl { display: block; font-size: 12px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--nx-text-400); margin-bottom: 7px; }
    .in { width: 100%; box-sizing: border-box; height: 42px; padding: 0 13px; border-radius: 10px; border: 1px solid #DDD9D1; margin-bottom: 18px; outline: none; background: #fff; font-family: inherit; font-size: 14px; color: var(--nx-text); }

    .ro { display: flex; align-items: flex-start; gap: 12px; padding: 13px 14px; border: 1px solid #E2DFD8; border-radius: 11px; background: var(--nx-surface-3); }
    .ro--on { background: rgba(91,95,233,.04); }
    .ro__ic { width: 32px; height: 32px; flex: none; border-radius: 8px; background: #fff; border: 1px solid #ECEAE4; color: #7a7682; display: flex; align-items: center; justify-content: center; }
    .ro__t { flex: 1; min-width: 0; }
    .ro__title { font-size: 13.5px; font-weight: 600; color: var(--nx-text); }
    .ro__desc { font-size: 12px; color: var(--nx-text-500); margin-top: 2px; line-height: 1.45; }
    .sw { width: 42px; height: 24px; flex: none; border-radius: 13px; border: none; background: #cfccc4; cursor: pointer; position: relative; padding: 0; }
    .sw--on { background: var(--nx-indigo); }
    .knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .15s; box-shadow: 0 1px 3px rgba(0,0,0,.25); }
    .sw--on .knob { left: 21px; }

    .vis { margin-top: 20px; }
    .vis__t { font-size: 11.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--nx-text-400); margin-bottom: 10px; }

    .note { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 12px; color: var(--nx-text-400); }
    .ghost { height: 38px; padding: 0 16px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-btn); background: #fff; color: var(--nx-text-600); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .primary { height: 38px; padding: 0 18px; border: none; border-radius: var(--nx-r-btn); background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .primary:disabled { background: #cfccc4; cursor: not-allowed; }
  `],
})
export class NouveauCanalComponent {
  @Input() scope: 'org' | 'project' = 'org';
  @Input() project = 'Refonte App Mobile';
  @Output() closed = new EventEmitter<void>();

  private router = inject(Router);
  private channelsSvc = inject(ChannelsService);
  private toast = inject(ToastService);

  raw = signal('');
  readonly = signal(false);
  kind = signal<'hash' | 'bell'>('hash');
  mode = signal<ChannelAccessMode>('open');
  grants = signal<ChannelGrant[]>([]);

  name = computed(() => this.raw().trim().replace(/^#+/, '').replace(/\s+/g, '-'));

  get roDesc(): string {
    return this.scope === 'org'
      ? 'Seuls les administrateurs peuvent publier ; les autres membres ont un accès en lecture seule.'
      : 'Seuls les administrateurs et le chef de projet peuvent publier ; les autres membres ont un accès en lecture seule.';
  }
  get noteText(): string {
    return this.scope === 'org'
      ? "La création de canaux d'organisation est réservée aux administrateurs."
      : 'La création de canaux de projet est réservée aux administrateurs et au chef de projet.';
  }

  create(): void {
    const n = this.name();
    if (!n) return;
    const channel = this.channelsSvc.create({
      name: n,
      scope: this.scope,
      project: this.scope === 'project' ? this.project : undefined,
      kind: this.kind(),
      readonly: this.readonly(),
      restriction: { mode: this.mode(), grants: this.grants() },
    });
    this.toast.show({ message: 'Canal « #' + channel.name + ' » créé' });
    this.closed.emit();
    this.router.navigate(['/app/canaux', channel.id]);
  }
}
