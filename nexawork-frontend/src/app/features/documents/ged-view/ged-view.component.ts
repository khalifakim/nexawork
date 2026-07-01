import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ApercuDocumentComponent } from '@shared/overlays/apercu-document/apercu-document.component';
import { NouveauDossierComponent } from '@features/documents/modals/nouveau-dossier/nouveau-dossier.component';
import { ImporterFichierComponent } from '@features/documents/modals/importer-fichier/importer-fichier.component';
import { GedService } from '@core/services/ged.service';
import { GedItem, GedType } from '@core/models/ged.models';
import { GED_COLOR, GED_ICON, TASK_FOLDER } from '@core/util/ui.util';

@Component({
  selector: 'app-ged-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ApercuDocumentComponent, NouveauDossierComponent, ImporterFichierComponent],
  template: `
    <div class="ged">
      <!-- toolbar -->
      <div class="toolbar">
        <div class="search"><app-icon name="search" [size]="16" /><input placeholder="Rechercher un document ou un dossier…" [value]="q()" (input)="q.set($any($event.target).value)" /></div>
        <button class="chip">Type<app-icon name="chevronDown" [size]="13" [stroke]="2.4" /></button>
        <span class="spacer"></span>
        @if (!readonly) {
          <button class="btn btn--ghost" [disabled]="inSystem()" [title]="inSystem() ? 'Indisponible dans le dossier système' : ''" (click)="newFolder.set(true)"><app-icon name="folderPlus" [size]="16" />Nouveau dossier</button>
          <button class="btn btn--primary" [disabled]="inSystem()" (click)="upload.set(true)"><app-icon name="upload" [size]="16" />Importer</button>
        }
      </div>

      <!-- breadcrumb -->
      @if (path().length) {
        <div class="crumbs">
          <button class="crumb" (click)="path.set([])"><app-icon name="home" [size]="15" />Documents</button>
          @for (seg of path(); track $index; let i = $index) {
            <app-icon class="sep" name="chevronRight" [size]="16" />
            @if (i === path().length - 1) { <span class="crumb crumb--cur">{{ seg }}</span> }
            @else { <button class="crumb" (click)="goTo(i)">{{ seg }}</button> }
          }
        </div>
      }

      <!-- system folder banner -->
      @if (inSystem()) {
        <div class="banner">
          <app-icon name="info" [size]="18" />
          <span>Ce dossier regroupe automatiquement tous les fichiers attachés aux tâches du projet. Vous pouvez les consulter ou les télécharger ; pour les modifier, rendez-vous sur la tâche associée.</span>
        </div>
      }

      <!-- bulk bar -->
      @if (selCount() > 0 && !readonly) {
        <div class="bulk">
          <span class="bulk__c">{{ selCount() }} {{ selCount() > 1 ? 'éléments sélectionnés' : 'élément sélectionné' }}</span>
          <span class="spacer"></span>
          <button class="bulk__b" (click)="toast('Téléchargement de ' + selCount() + ' élément(s)…')"><app-icon name="download" [size]="15" />Télécharger</button>
          <button class="bulk__b bulk__b--danger" (click)="bulkDelete()"><app-icon name="trash" [size]="15" />Supprimer</button>
          <button class="bulk__x" (click)="selected.set([])"><app-icon name="x" [size]="16" /></button>
        </div>
      }

      <!-- table -->
      <div class="tbl">
        <div class="thead" [style.grid-template-columns]="grid()">
          <span class="cb">@if (!inSystem() && !readonly) { <button class="box" [class.box--on]="allSel()" (click)="toggleAll()">@if (allSel()) { <app-icon name="check" [size]="12" [stroke]="2.6" /> }</button> }</span>
          @for (c of cols(); track c) { <span class="th">{{ c }}</span> }
        </div>
        @for (it of shown(); track it.name) {
          <div class="trow" [style.grid-template-columns]="grid()" [class.trow--sel]="isSel(it.name)" (click)="rowClick(it)">
            <span class="cb">@if (!it.system && !inSystem() && !readonly) { <button class="box" [class.box--on]="isSel(it.name)" (click)="toggleSel(it.name); $event.stopPropagation()">@if (isSel(it.name)) { <app-icon name="check" [size]="12" [stroke]="2.6" /> }</button> }</span>
            <span class="name">
              <span class="ic" [class.ic--sys]="it.system" [style.color]="it.system ? 'var(--nx-indigo)' : color(it.type)"><app-icon [name]="it.system ? 'folder' : icon(it.type)" [size]="18" /></span>
              <span class="nm" [class.nm--folder]="it.type==='folder'">{{ it.name }}</span>
            </span>
            @if (inSystem()) {
              <span class="task"><span class="task__id nx-mono">{{ it.task?.id }}</span><span class="task__t">{{ it.task?.title }}</span></span>
              <span class="muted">{{ it.owner }}</span>
              <span class="muted">{{ it.size }}</span>
              <span class="muted">{{ it.added }}</span>
              <span class="act"><button class="open" title="Ouvrir la tâche associée" (click)="$event.stopPropagation()"><app-icon name="external" [size]="16" /></button></span>
            } @else {
              <span class="muted">{{ it.system ? '—' : it.owner }}</span>
              <span class="muted">{{ it.size }}</span>
              <span class="mod">@if (!it.system) { <span class="mod__a">{{ it.mod }}</span><span class="mod__b">par {{ it.by }}</span> } @else { <span class="muted">—</span> }</span>
              <span class="act">@if (!it.system && !readonly) { <button class="dots" (click)="$event.stopPropagation()"><app-icon name="dots" [size]="16" /></button> }</span>
            }
          </div>
        } @empty {
          <div class="empty">{{ inSystem() ? "Aucun fichier n'est encore attaché aux tâches de ce projet." : 'Aucun document trouvé' }}</div>
        }
      </div>
    </div>

    @if (preview(); as p) { <app-apercu-document [name]="p" (closed)="preview.set(null)" /> }
    @if (newFolder()) { <app-nouveau-dossier (closed)="newFolder.set(false)" (created)="toast('Dossier « ' + $event + ' » créé'); newFolder.set(false)" /> }
    @if (upload()) { <app-importer-fichier (closed)="upload.set(false)" (imported)="toast('Fichier importé'); upload.set(false)" /> }

    @if (toastMsg(); as t) { <div class="gtoast"><span class="gtoast__i"><app-icon name="check" [size]="14" /></span>{{ t }}</div> }
  `,
  styleUrl: './ged-view.component.scss',
})
export class GedViewComponent {
  @Input() project: string | null = null;
  @Input() readonly = false;

  path = signal<string[]>([]);
  q = signal('');
  selected = signal<string[]>([]);
  deleted = signal<string[]>([]);
  preview = signal<string | null>(null);
  newFolder = signal(false);
  upload = signal(false);
  toastMsg = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  private ged = inject(GedService);
  inSystem = computed(() => this.path()[this.path().length - 1] === TASK_FOLDER);

  private current = toSignal(
    toObservable(this.path).pipe(switchMap(p => this.ged.folderContent(p, this.project))),
    { initialValue: [] as GedItem[] },
  );

  shown = computed(() => {
    const q = this.q().toLowerCase().trim();
    const del = this.deleted();
    return this.current().filter(it => it.name.toLowerCase().includes(q) && !del.includes(it.name));
  });

  cols = computed(() => this.inSystem()
    ? ['Nom', 'Tâche associée', 'Propriétaire', 'Taille', "Date d'ajout", '']
    : ['Nom', 'Propriétaire', 'Taille', 'Dernière modification', '']);
  grid = computed(() => this.inSystem()
    ? '34px minmax(0,2.1fr) minmax(0,1.7fr) minmax(0,.95fr) 72px minmax(0,1fr) 66px'
    : '34px minmax(0,2.6fr) minmax(0,.9fr) 72px minmax(0,1.15fr) 40px');

  icon(t: GedType): string { return GED_ICON[t]; }
  color(t: GedType): string { return GED_COLOR[t]; }

  isSel(n: string): boolean { return this.selected().includes(n); }
  toggleSel(n: string): void { this.selected.update(l => l.includes(n) ? l.filter(x => x !== n) : [...l, n]); }
  selCount = computed(() => this.shown().filter(it => this.selected().includes(it.name)).length);
  allSel = computed(() => { const names = this.shown().filter(it => !it.system).map(it => it.name); return names.length > 0 && names.every(n => this.selected().includes(n)); });
  toggleAll(): void { const names = this.shown().filter(it => !it.system).map(it => it.name); this.selected.set(this.allSel() ? [] : names); }
  bulkDelete(): void { this.deleted.update(d => [...d, ...this.selected()]); this.selected.set([]); this.toast('Déplacé vers la corbeille'); }

  rowClick(it: GedItem): void {
    if (it.type === 'folder') this.path.update(p => [...p, it.name]);
    else this.preview.set(it.name);
  }
  goTo(i: number): void { this.path.update(p => p.slice(0, i + 1)); }

  toast(msg: string): void {
    this.toastMsg.set(msg);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 2600);
  }
}
