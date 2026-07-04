import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { ModalShellComponent } from '@shared/ui/modal-shell/modal-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ChannelsService } from '@core/services/channels.service';
import { ToastService } from '@core/services/toast.service';

/** « Modifier le canal » — icon picker + rename, faithful to `channelRenameModalView`. */
@Component({
  selector: 'app-modifier-canal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalShellComponent, IconComponent],
  template: `
    <app-modal-shell title="Modifier le canal" [subtitle]="'#' + initialName"
                     [width]="460" (closed)="closed.emit()">
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
      <input class="in" autofocus placeholder="nom-du-canal"
             [value]="raw()" (input)="raw.set($any($event.target).value)"
             (keydown.enter)="save()" />

      <div footer>
        <button class="ghost" (click)="closed.emit()">Annuler</button>
        <button class="primary" [disabled]="!name()" (click)="save()">Modifier</button>
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
    .in { width: 100%; box-sizing: border-box; height: 42px; padding: 0 13px; border-radius: 10px; border: 1px solid #DDD9D1; outline: none; background: #fff; font-family: inherit; font-size: 14px; color: var(--nx-text); }

    .ghost { height: 38px; padding: 0 16px; border: 1px solid var(--nx-border); border-radius: var(--nx-r-btn); background: #fff; color: var(--nx-text-600); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .primary { height: 38px; padding: 0 18px; border: none; border-radius: var(--nx-r-btn); background: var(--nx-indigo); color: #fff; font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
    .primary:disabled { background: #cfccc4; cursor: not-allowed; }
  `],
})
export class ModifierCanalComponent {
  @Input({ required: true }) id!: string;
  @Input() initialName = '';
  @Input() initialKind: 'hash' | 'bell' = 'hash';
  @Output() closed = new EventEmitter<void>();

  private channelsSvc = inject(ChannelsService);
  private toast = inject(ToastService);

  raw = signal('');
  kind = signal<'hash' | 'bell'>('hash');
  name = computed(() => this.raw().trim().replace(/^#+/, '').replace(/\s+/g, '-'));

  ngOnInit(): void {
    this.raw.set(this.initialName);
    this.kind.set(this.initialKind);
  }

  save(): void {
    const n = this.name();
    if (!n) return;
    this.channelsSvc.rename(this.id, { name: n, kind: this.kind() });
    this.toast.show({ message: 'Canal mis à jour « #' + n + ' »' });
    this.closed.emit();
  }
}
