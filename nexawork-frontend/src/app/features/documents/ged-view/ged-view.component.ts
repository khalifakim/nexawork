import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, tap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { LoaderComponent } from '@shared/ui/loader/loader.component';
import { ApercuDocumentComponent } from '@shared/overlays/apercu-document/apercu-document.component';
import { FilterChipComponent, FilterOption } from '@shared/ui/filter-chip/filter-chip.component';
import { DocMenuComponent, DocMenuItem } from '@shared/ui/doc-menu/doc-menu.component';
import { NouveauDossierComponent } from '@features/documents/modals/nouveau-dossier/nouveau-dossier.component';
import { ImporterFichierComponent } from '@features/documents/modals/importer-fichier/importer-fichier.component';
import { GedService } from '@core/services/ged.service';
import { GedOverlayBus } from '@core/services/ged-overlay.bus';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { GedItem, GedType } from '@core/models/ged.models';
import { GED_COLOR, GED_ICON, TASK_FOLDER } from '@core/util/ui.util';

@Component({
  selector: 'app-ged-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ApercuDocumentComponent, FilterChipComponent, DocMenuComponent, NouveauDossierComponent, ImporterFichierComponent, LoaderComponent],
  template: `
    <div class="ged">
      <!-- toolbar -->
      <div class="toolbar">
        <div class="search"><app-icon name="search" [size]="16" /><input placeholder="Rechercher un document ou un dossier…" [value]="q()" (input)="q.set($any($event.target).value)" /></div>
        <app-filter-chip label="Type" [options]="TYPE_OPTS" [value]="fType()" (valueChange)="fType.set($event)" />
        <app-filter-chip label="Date" [options]="DATE_OPTS" [value]="fDate()" (valueChange)="fDate.set($event)" />
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
        @if (loading()) {
          <app-loader label="Chargement des documents…" [minHeight]="180" />
        } @else {
        @for (it of shown(); track it.name) {
          <div class="trow" [style.grid-template-columns]="grid()" [class.trow--sel]="isSel(it.name)" (click)="rowClick(it)">
            <span class="cb">@if (!it.system && !inSystem() && !readonly) { <button class="box" [class.box--on]="isSel(it.name)" (click)="toggleSel(it.name); $event.stopPropagation()">@if (isSel(it.name)) { <app-icon name="check" [size]="12" [stroke]="2.6" /> }</button> }</span>
            <span class="name">
              <!-- L'icône reflète TOUJOURS le type réel du fichier ; le cadenas
                   signale seulement qu'il s'agit d'un élément système (lecture seule). -->
              <span class="ic" [class.ic--sys]="it.system && it.type==='folder'" [class.ic--folder]="it.type==='folder'" [style.color]="color(it.type)" [title]="it.system ? 'Élément système — lecture seule' : ''">
                <app-icon [name]="icon(it.type)" [size]="18" />
                @if (it.system) { <span class="ic__lock"><app-icon name="lock" [size]="9" /></span> }
              </span>
              <span class="nm" [class.nm--folder]="it.type==='folder'">{{ it.name }}</span>
              @if (!it.system && gedOverlay.hasRestriction(it.name)) {
                <button class="lk" [class.lk--priv]="gedOverlay.restrictionOf(it.name).mode === 'private'"
                        title="Accès restreint — gérer les accès"
                        (click)="gedOverlay.openAccessFor(it); $event.stopPropagation()">
                  <app-icon name="lock" [size]="13" />
                </button>
              }
            </span>
            @if (inSystem()) {
              <button type="button" class="task" title="Ouvrir la tâche associée"
                      (click)="openTaskChip(it.task?.id, $event)">
                <span class="task__id nx-mono">{{ it.task?.key }}</span>
                <span class="task__t">{{ it.task?.title }}</span>
              </button>
              <span class="muted">{{ it.owner }}</span>
              <span class="muted">{{ it.size }}</span>
              <span class="muted">{{ it.added }}</span>
              <span class="act">
                <button class="dots" [class.dots--on]="menu() === it.name" title="Actions" (click)="toggleMenu(it.name, $event)"><app-icon name="dots" [size]="16" /></button>
                @if (menu() === it.name) {
                  <app-doc-menu [items]="sysMenuItems(it)" (action)="onAction($event, it)" (closed)="menu.set(null)" />
                }
              </span>
            } @else {
              <span class="muted">{{ it.system ? '—' : it.owner }}</span>
              <span class="muted">{{ it.size }}</span>
              <span class="mod">@if (!it.system) { <span class="mod__a">{{ it.mod }}</span><span class="mod__b">par {{ it.by }}</span> } @else { <span class="muted">—</span> }</span>
              <span class="act">@if (!it.system && !readonly) {
                <button class="dots" [class.dots--on]="menu() === it.name" (click)="toggleMenu(it.name, $event)"><app-icon name="dots" [size]="16" /></button>
                @if (menu() === it.name) {
                  <app-doc-menu [items]="rowMenuItems(it)" (action)="onAction($event, it)" (closed)="menu.set(null)" />
                }
              }</span>
            }
          </div>
        } @empty {
          <div class="empty">{{ inSystem() ? "Aucun fichier n'est encore attaché aux tâches de ce projet." : 'Aucun document trouvé' }}</div>
        }
        }
      </div>
    </div>

    @if (preview(); as p) { <app-apercu-document [name]="p.name" [url]="p.url" (closed)="preview.set(null)" /> }
    @if (newFolder()) { <app-nouveau-dossier [scope]="modalScope()" (closed)="newFolder.set(false)" (created)="onCreateFolder($event)" /> }
    @if (upload()) { <app-importer-fichier [scope]="modalScope()" [busy]="uploadBusy()" [error]="uploadError()" (closed)="closeUpload()" (imported)="onImportFile($event)" /> }

    @if (toastMsg(); as t) { <div class="gtoast"><span class="gtoast__i"><app-icon name="check" [size]="14" /></span>{{ t }}</div> }
  `,
  styleUrl: './ged-view.component.scss',
})
export class GedViewComponent {
  /** UUID du projet (GED de projet) ou `null` (GED d'organisation). */
  @Input() projectId: string | null = null;
  @Input() readonly = false;
  /** Hide the system "Pièces jointes aux tâches" folder (used by the org space). */
  @Input() hideTaskFolder = false;

  /** R16 — the scope passed to the create/import modals: project vs org. */
  modalScope = computed<'org' | 'project'>(() => this.projectId ? 'project' : 'org');

  path = signal<string[]>([]);
  q = signal('');
  fType = signal<string | null>(null);
  fDate = signal<string | null>(null);
  selected = signal<string[]>([]);
  deleted = signal<string[]>([]);
  preview = signal<GedItem | null>(null);
  newFolder = signal(false);
  upload = signal(false);
  /** Upload GED en cours (loader dans le modal). */
  uploadBusy = signal(false);
  /** Message d'erreur d'upload (affiché dans le modal, qui reste ouvert). */
  uploadError = signal('');
  menu = signal<string | null>(null);
  toastMsg = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  readonly TYPE_OPTS: FilterOption[] = [
    { value: 'pdf', label: 'PDF', dot: '#F5564E' },
    { value: 'doc', label: 'Document', dot: '#5B8DEF' },
    { value: 'img', label: 'Image', dot: '#2BB673' },
    { value: 'fig', label: 'Figma', dot: '#6C70F0' },
    { value: 'sheet', label: 'Tableur', dot: '#E89A2C' },
  ];
  readonly DATE_OPTS: FilterOption[] = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'older', label: 'Plus ancien' },
  ];

  private ged = inject(GedService);
  protected gedOverlay = inject(GedOverlayBus);
  private bus = inject(ShellBus);
  inSystem = computed(() => this.path()[this.path().length - 1] === TASK_FOLDER);

  /** Bumpé après une écriture pour recharger le dossier courant. */
  private refresh = signal(0);
  private trigger = computed(() => ({ p: this.path(), r: this.refresh() }));
  /** Vrai tant que le contenu du dossier courant n'est pas arrivé (loader). */
  loading = signal(true);
  private current = toSignal(
    toObservable(this.trigger).pipe(
      tap(() => this.loading.set(true)),
      switchMap(t => this.ged.folderContent(t.p, this.projectId)),
      // Le cadenas « accès restreint » suit le `restricted` calculé par le backend.
      tap(items => {
        this.gedOverlay.setRestrictedNames(items.filter(i => i.restricted).map(i => i.name));
        this.loading.set(false);
      }),
    ),
    { initialValue: [] as GedItem[] },
  );
  private reload(): void { this.refresh.update(v => v + 1); }

  onCreateFolder(ev: { name: string; restricted: boolean }): void {
    this.newFolder.set(false);
    this.ged.createFolder(this.path(), this.projectId, ev.name, ev.restricted)
      .subscribe(() => { this.reload(); this.toast('Dossier « ' + ev.name + ' » créé'); });
  }

  /**
   * Import : le modal reste ouvert avec un loader jusqu'à la réponse. Succès →
   * recharge l'espace, toast, ferme. Échec → message d'erreur dans le modal.
   */
  onImportFile(ev: { file: File; name: string; restricted: boolean }): void {
    this.uploadError.set('');
    this.uploadBusy.set(true);
    this.ged.importFile(this.path(), this.projectId, ev.file, ev.name, ev.restricted)
      .subscribe({
        next: () => {
          this.uploadBusy.set(false);
          this.upload.set(false);        // ferme le modal
          this.reload();                 // met à jour l'espace GED
          this.toast('« ' + ev.name + ' » importé');
        },
        error: () => {
          this.uploadBusy.set(false);
          this.uploadError.set("L'import a échoué. Vérifiez le fichier et réessayez.");
        },
      });
  }

  /** Ferme le modal d'import (ignoré pendant l'upload). */
  closeUpload(): void {
    if (this.uploadBusy()) return;
    this.upload.set(false);
    this.uploadError.set('');
  }

  shown = computed(() => {
    const q = this.q().toLowerCase().trim();
    const del = this.deleted();
    const ft = this.fType();
    const fd = this.fDate();
    return this.current().filter(it => {
      if (this.hideTaskFolder && it.system) return false;
      if (!it.name.toLowerCase().includes(q)) return false;
      if (del.includes(it.name)) return false;
      // REF G — filter out documents the current user cannot access.
      // System (task-attachment) rows are always visible: they inherit the
      // access rules of their originating task (handled by the Project Service).
      if (!it.system && !this.gedOverlay.hasAccess(it.name, it.owner)) return false;
      // Type filter never hides folders (matches the prototype).
      if (ft && it.type !== 'folder' && it.type !== ft) return false;
      if (fd && it.mod) {
        const m = it.mod.toLowerCase();
        if (fd === 'today' && !m.includes("aujourd'hui")) return false;
        if (fd === 'week' && !(m.includes("aujourd'hui") || m.includes('hier'))) return false;
        if (fd === 'month' && (m.includes('semaine') || m.includes('mois'))) return false;
        if (fd === 'older' && (m.includes("aujourd'hui") || m.includes('hier') || m.includes('2 j') || m.includes('3 j'))) return false;
      }
      return true;
    });
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
  bulkDelete(): void {
    // R12 — keep only the items the current user is allowed to delete.
    const bag = this.shown();
    const allowed = this.selected().filter(name => {
      const it = bag.find(x => x.name === name);
      return this.gedOverlay.canDelete(name, it?.owner);
    });
    const skipped = this.selected().length - allowed.length;
    if (!allowed.length) {
      this.toast('Aucun élément supprimable dans votre sélection.');
      return;
    }
    this.deleted.update(d => [...d, ...allowed]);
    // Suppression réelle de chaque élément autorisé (corbeille pour les fichiers).
    for (const name of allowed) {
      const it = bag.find(x => x.name === name);
      if (it) this.ged.deleteItem(it).subscribe({ error: () => this.deleted.update(d => d.filter(n => n !== name)) });
    }
    this.selected.set([]);
    if (skipped > 0) {
      this.toast(allowed.length + ' déplacé' + (allowed.length > 1 ? 's' : '') + ' vers la corbeille · ' + skipped + ' ignoré' + (skipped > 1 ? 's' : '') + ' (droits insuffisants)');
    } else {
      this.toast('Déplacé vers la corbeille');
    }
  }

  // ── Row 3-dots menu ────────────────────────────────────────────────────────
  toggleMenu(name: string, ev: Event): void { ev.stopPropagation(); this.menu.set(this.menu() === name ? null : name); }

  /** Menu for a standard file/folder (matches the prototype's `gedRowMenu`). */
  rowMenuItems(it: GedItem): DocMenuItem[] {
    const isFile = it.type !== 'folder';
    const items: DocMenuItem[] = [
      isFile
        ? { action: 'preview', label: 'Aperçu', icon: 'image' }
        : { action: 'open', label: 'Ouvrir', icon: 'folder' },
      { action: 'download', label: isFile ? 'Télécharger' : 'Télécharger (.zip)', icon: 'download' },
    ];
    if (isFile) items.push({ action: 'versions', label: 'Historique des versions', icon: 'clock' });
    items.push({ action: 'access', label: 'Gérer les accès', icon: 'lock', sep: true });
    items.push({ action: 'rename', label: 'Renommer', icon: 'edit' });
    // R12 — Supprimer only for the creator or an admin.
    if (this.gedOverlay.canDelete(it.name, it.owner)) {
      items.push({ action: 'delete', label: 'Supprimer', icon: 'trash', danger: true, sep: true });
    }
    return items;
  }

  /** Menu inside the system task-attachments folder (aperçu / télécharger / voir la tâche). */
  sysMenuItems(_it: GedItem): DocMenuItem[] {
    return [
      { action: 'preview', label: 'Aperçu', icon: 'image' },
      { action: 'download', label: 'Télécharger', icon: 'download' },
      { action: 'task', label: 'Voir la tâche associée', icon: 'external' },
    ];
  }

  onAction(action: string, it: GedItem): void {
    switch (action) {
      case 'preview':  this.preview.set(it); break;
      case 'open':     this.path.update(p => [...p, it.name]); break;
      case 'download': this.toast('Téléchargement de « ' + it.name + ' »…'); break;
      case 'versions': this.gedOverlay.openVersionsFor(it); break;
      case 'access':   this.gedOverlay.openAccessFor(it); break;
      case 'rename':   this.toast('Renommer « ' + it.name + ' »'); break;
      case 'delete':
        this.deleted.update(d => [...d, it.name]);
        this.ged.deleteItem(it).subscribe({ error: () => this.deleted.update(d => d.filter(n => n !== it.name)) });
        this.toast('« ' + it.name + ' » déplacé vers la corbeille');
        break;
      case 'task':     this.openTaskChip(it.task?.id, null); break;
    }
  }

  rowClick(it: GedItem): void {
    if (it.type === 'folder') this.path.update(p => [...p, it.name]);
    else this.preview.set(it);
  }
  goTo(i: number): void { this.path.update(p => p.slice(0, i + 1)); }

  /**
   * Open the task detail modal from either the "Tâche associée" chip in the
   * TASK_ATTACHMENTS folder, or the "Voir la tâche associée" menu action.
   */
  openTaskChip(taskId: string | undefined, ev: Event | null): void {
    if (ev) ev.stopPropagation();
    if (!taskId) return;
    this.bus.openTask(taskId);
    this.menu.set(null);
  }

  toast(msg: string): void {
    this.toastMsg.set(msg);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 2600);
  }
}
