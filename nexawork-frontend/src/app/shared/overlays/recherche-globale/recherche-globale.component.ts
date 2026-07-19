import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter,
  HostListener, Output, QueryList, ViewChild, ViewChildren, computed, effect, inject, signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { SearchService } from '@core/services/search.service';
import { SessionService } from '@core/services/session.service';
import { SearchResult as Result } from '@core/models/search.models';
import { AvatarDirectoryService } from '@core/services/avatar-directory.service';
import { slugify } from '@core/util/ui.util';
import { ShellBus } from '@layouts/app-shell/shell.bus';

@Component({
  selector: 'app-recherche-globale',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="ov" (click)="closed.emit()">
      <div class="panel" (click)="$event.stopPropagation()">
        <div class="in">
          <app-icon name="search" [size]="20" [stroke]="2" />
          <input #searchInput placeholder="Recherche globale…" [value]="query()"
                 (input)="onInput($any($event.target).value)" />
        </div>
        <div class="filters">
          @for (f of filters; track f.key) {
            <button class="chip" [class.chip--on]="filter()===f.key" (click)="setFilter(f.key)">
              @if (f.icon) { <app-icon [name]="f.icon" [size]="15" /> }{{ f.label }}
            </button>
          }
        </div>
        <div class="results" #resList>
          <div class="rh">{{ shown().length }} résultat{{ shown().length > 1 ? 's' : '' }}</div>
          @for (r of shown(); track r.name; let i = $index) {
            <div class="res" #resRow [class.res--on]="i===highlight()"
                 (mouseenter)="highlight.set(i)" (click)="open(r)">
              @if (r.avatar) {
                <!-- Photo de profil si l'annuaire en connaît une (le résultat porte
                     l'userId), initiales sinon. -->
                @if (photoOf(r); as photo) {
                  <img class="res__av res__av--img" [src]="photo" alt="" />
                } @else {
                  <span class="res__av" [style.background]="r.color">{{ r.avatar }}</span>
                }
              }
              @else if (r.radio) { <span class="res__radio" [style.border-color]="r.radio"></span> }
              @else if (r.hash) { <span class="res__hash">#</span> }
              @else { <span class="res__ic" [style.color]="r.color || 'var(--nx-text-500)'"><app-icon [name]="r.icon || 'file'" [size]="18" /></span> }
              <div class="res__b">
                @if (r.mono) { <span class="res__mono nx-mono">{{ r.mono }}</span> }
                <span class="res__n">{{ r.name }}</span>
                <span class="res__ctx">{{ r.ctx }}</span>
              </div>
              <span class="res__d">{{ r.date }}</span>
            </div>
          } @empty {
            <div class="res-empty">Aucun résultat pour votre recherche.</div>
          }
        </div>
        <div class="foot">
          <span><span class="k">↑</span><span class="k">↓</span> naviguer</span>
          <span><span class="k">←</span><span class="k">→</span> onglets</span>
          <span><span class="k">↵</span> ouvrir</span>
          <span><span class="k">Échap</span> fermer</span>
        </div>
      </div>
    </div>
  `,
  styleUrl: './recherche-globale.component.scss',
})
export class RechercheGlobaleComponent implements AfterViewInit {
  @Output() closed = new EventEmitter<void>();
  query = signal('');
  filter = signal('tous');
  /** Index of the highlighted result row within `shown()`. */
  highlight = signal(0);

  filters = [
    { key: 'tous', label: 'Tous', icon: '' },
    { key: 'taches', label: 'Tâches', icon: 'taskCheck' },
    { key: 'documents', label: 'Documents', icon: 'file' },
    { key: 'projets', label: 'Projets', icon: 'projects' },
    { key: 'canaux', label: 'Canaux', icon: 'hash' },
    { key: 'messages', label: 'Messages', icon: 'comment' },
    { key: 'personnes', label: 'Personnes', icon: 'teams' },
  ];

  private session = inject(SessionService);
  private searchSvc = inject(SearchService);
  private router = inject(Router);
  private bus = inject(ShellBus);
  private avatars = inject(AvatarDirectoryService);

  /**
   * Photo d'un résultat « personne ». Le résultat porte l'`userId` (`r.id`), mais
   * les endpoints `/search` ne renvoient pas les photos : on la résout via
   * l'annuaire du workspace, déjà chargé.
   */
  photoOf(r: Result): string | undefined {
    return r.type === 'personnes' ? this.avatars.photoOf(r.id) : undefined;
  }

  /**
   * Résultats de la recherche fédérée. La requête part au serveur (debounce
   * 250 ms) qui interroge chaque domaine en respectant les droits ; le filtre
   * par type reste appliqué côté client sur le jeu renvoyé.
   */
  private results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(q => this.searchSvc.query(q)),
    ),
    { initialValue: [] as Result[] },
  );

  shown = computed(() => {
    const f = this.filter();
    return this.results().filter(r => f === 'tous' || r.type === f);
  });

  @ViewChildren('resRow') private rows!: QueryList<ElementRef<HTMLDivElement>>;
  @ViewChild('searchInput', { static: true }) private searchInput!: ElementRef<HTMLInputElement>;

  constructor() {
    // Reset highlight and scroll to top when the filter or the query changes:
    // the previous row index may not exist in the new result set.
    effect(() => {
      this.shown();
      this.highlight.set(0);
      queueMicrotask(() => this.scrollRowIntoView(0));
    });
    // Keep the highlighted row visible when the user navigates with arrows.
    effect(() => this.scrollRowIntoView(this.highlight()));
  }

  ngAfterViewInit(): void {
    // First render: make sure the initial row is visible.
    queueMicrotask(() => this.scrollRowIntoView(this.highlight()));
    // Immediately focus the search input so the user can start typing without
    // clicking. `autofocus` is unreliable for elements inserted via `@if`, so we
    // do it explicitly.
    queueMicrotask(() => this.searchInput?.nativeElement.focus());
  }

  onInput(v: string): void { this.query.set(v); }

  setFilter(key: string): void {
    if (this.filter() === key) return;
    this.filter.set(key);
  }

  /** Move the filter chip left/right (loops at both ends). */
  private cycleFilter(delta: 1 | -1): void {
    const keys = this.filters.map(f => f.key);
    const i = keys.indexOf(this.filter());
    const next = (i + delta + keys.length) % keys.length;
    this.filter.set(keys[next]);
  }

  private scrollRowIntoView(index: number): void {
    const el = this.rows?.get(index)?.nativeElement;
    if (!el) return;
    // `nearest` keeps the row on screen without jumping when it's already visible.
    el.scrollIntoView({ block: 'nearest' });
  }

  /** Close then navigate to the concerned element (mirrors the prototype's navigateResult). */
  open(r: Result): void {
    this.closed.emit();
    switch (r.type) {
      case 'taches':
        // Backend réel : `id` est l'UUID de la tâche ; en mock, `mono` est sa clé.
        this.bus.openTask(r.id ?? r.mono ?? '');
        break;
      case 'documents': this.bus.openDocument(r.name); break;
      case 'projets':   this.router.navigate(['/app/projets', r.id ?? slugify(r.name), 'kanban']); break;
      case 'canaux':    this.router.navigate(['/app/canaux', slugify(r.name)]); break;
      case 'messages':  this.router.navigate(['/app/conversations']); break;
      case 'personnes': this.bus.openProfile(r.name); break;
    }
  }

  /**
   * Global keyboard navigation. Fires from `document` so it works while the
   * input is focused (the input doesn't consume arrow keys anyway).
   * - Arrow Up/Down navigate results (loop).
   * - Arrow Left/Right switch the filter tab (loop).
   * - Enter opens the highlighted result.
   * - Escape closes the modal.
   */
  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') { ev.preventDefault(); this.closed.emit(); return; }

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      const n = this.shown().length;
      if (n === 0) return;
      this.highlight.set((this.highlight() + 1) % n);
      return;
    }
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      const n = this.shown().length;
      if (n === 0) return;
      this.highlight.set((this.highlight() - 1 + n) % n);
      return;
    }
    if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      this.cycleFilter(1);
      return;
    }
    if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      this.cycleFilter(-1);
      return;
    }
    if (ev.key === 'Enter') {
      const list = this.shown();
      const r = list[this.highlight()];
      if (r) { ev.preventDefault(); this.open(r); }
      return;
    }
  }
}
