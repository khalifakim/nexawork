import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ProjectsService } from '@core/services/projects.service';
import { Project } from '@core/models/project.models';

/** Sidebar 2 body — contextual sub-navigation for the active rail section. */
@Component({
  selector: 'app-sidebar2',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent, NgTemplateOutlet],
  template: `
    @switch (section) {

      <!-- ============ ACCUEIL ============ -->
      @case ('accueil') {
        <a class="row" routerLink="/app/accueil/mes-taches" routerLinkActive="row--on">
          <app-icon class="row__i" name="taskCheck" [size]="16" /><span>Mes tâches</span>
        </a>
        <a class="row" routerLink="/app/accueil/mentions-recues" routerLinkActive="row--on">
          <app-icon class="row__i" name="at" [size]="16" /><span>Mentions reçues</span><span class="row__badge">3</span>
        </a>
        <a class="row" routerLink="/app/accueil/tableau-de-bord" routerLinkActive="row--on">
          <app-icon class="row__i" name="dashboard" [size]="16" /><span>Tableau de bord</span>
        </a>
      }

      <!-- ============ PROJETS / ÉQUIPES ============ -->
      @case ('projets') { <ng-container *ngTemplateOutlet="projets"></ng-container> }
      @case ('equipes') {
        <button class="search"><app-icon name="search" [size]="15" /><input placeholder="Rechercher une équipe…" /></button>
        <div class="head">Projets du workspace</div>
        @for (p of projects(); track p.id) {
          <a class="row" routerLink="/app/equipes" [class.row--on]="p.id==='refonte-app-mobile'">
            <span class="dot" [style.background]="p.color"></span><span>{{ p.name }}</span>
          </a>
        }
      }

      <!-- ============ DOCUMENTS ============ -->
      @case ('documents') {
        <a class="row" routerLink="/app/documents/partage" routerLinkActive="row--on">
          <app-icon class="row__i" name="share" [size]="16" /><span>Partagé avec moi</span>
        </a>
        <a class="row" routerLink="/app/documents/corbeille" routerLinkActive="row--on">
          <app-icon class="row__i" name="trash" [size]="16" /><span>Corbeille</span>
        </a>
        <div class="head">Espaces</div>
        <a class="row" routerLink="/app/documents/organisation" routerLinkActive="row--on">
          <app-icon class="row__i" name="building" [size]="16" /><span>Espace Organisation</span>
        </a>
        <a class="row" routerLink="/app/documents/projets" routerLinkActive="row--on">
          <app-icon class="row__i" name="folder" [size]="16" /><span>Espace Projets</span>
          <button class="chev" (click)="toggleDocsProj($event)"><app-icon [name]="docsProjOpen() ? 'chevronDown' : 'chevronRight'" [size]="15" /></button>
        </a>
        @if (docsProjOpen()) {
          <div class="sub">
            @for (p of projects(); track p.id) {
              <a class="row row--sub" [routerLink]="['/app/documents/projets', p.id]" routerLinkActive="row--on">
                <span class="dot" [style.background]="p.color"></span><span>{{ p.name }}</span>
              </a>
            }
          </div>
        }
      }

      <!-- ============ CANAUX ============ -->
      @case ('canaux') {
        <div class="head head--row"><span>Canaux Organisation</span>
          <button class="add" (click)="newChannel.emit('org')"><app-icon name="plus" [size]="16" /></button></div>
        <a class="row" routerLink="/app/canaux/annonces" routerLinkActive="row--on"><app-icon class="row__i" name="bell" [size]="16" /><span>annonces</span></a>
        <a class="row" routerLink="/app/canaux/general" routerLinkActive="row--on"><app-icon class="row__i" name="hash" [size]="16" /><span>général</span></a>
        <a class="row" routerLink="/app/canaux/design-veille" routerLinkActive="row--on"><app-icon class="row__i" name="hash" [size]="16" /><span>design-veille</span></a>
        <div class="head head--row"><span>Canaux Projets</span></div>
        <button class="row row--group" (click)="canauxGrp.set(!canauxGrp())">
          <app-icon class="row__i" name="projects" [size]="16" /><span>Refonte App Mobile</span>
          <button class="add" (click)="newChannel.emit('project'); $event.stopPropagation()"><app-icon name="plus" [size]="16" /></button>
          <span class="chev2" [style.transform]="canauxGrp() ? '' : 'rotate(-90deg)'"><app-icon name="chevronDown" [size]="15" /></span>
        </button>
        @if (canauxGrp()) {
          <a class="row row--sub" routerLink="/app/canaux/annonces-projet" routerLinkActive="row--on"><app-icon class="row__i" name="bell" [size]="16" /><span>annonces-projet</span></a>
          <a class="row row--sub" routerLink="/app/canaux/general-projet" routerLinkActive="row--on"><app-icon class="row__i" name="hash" [size]="16" /><span>général-projet</span></a>
          <a class="row row--sub" routerLink="/app/canaux/dev-frontend" routerLinkActive="row--on"><app-icon class="row__i" name="hash" [size]="16" /><span>dev-frontend</span></a>
        }
      }

      <!-- ============ CONVERSATIONS ============ -->
      @case ('conversations') {
        <button class="primary" (click)="newMessage.emit()"><app-icon name="plus" [size]="16" />Nouveau message</button>
        <a class="row row--actifs" routerLink="/app/conversations/actifs" routerLinkActive="row--on">
          <span class="dot" style="background:var(--nx-success)"></span><span style="flex:1">Actifs maintenant</span><span class="row__badge">3</span>
        </a>
        <div class="head">Conversations</div>
        @for (c of convos; track c.id) {
          <a class="conv" [routerLink]="['/app/conversations', c.id]" routerLinkActive="conv--on">
            <span class="conv__av" [style.background]="c.color">{{ c.initials }}</span>
            <span class="conv__t"><span class="conv__n">{{ c.name }}</span><span class="conv__m">{{ c.msg }}</span></span>
            @if (c.unread) { <span class="conv__u">{{ c.unread }}</span> }
          </a>
        }
      }

      <!-- ============ RÉUNIONS ============ -->
      @case ('reunions') {
        <a class="row" routerLink="/app/reunions/lancer" routerLinkActive="row--on"><app-icon class="row__i" name="video" [size]="16" /><span>Lancer une réunion</span></a>
        <a class="row" routerLink="/app/reunions/historique" routerLinkActive="row--on"><app-icon class="row__i" name="clock" [size]="16" /><span>Historique discussion</span></a>
      }

      <!-- ============ PARAMÈTRES ============ -->
      @case ('parametres') {
        <div class="head">Compte</div>
        <a class="row" routerLink="/app/parametres/profil" routerLinkActive="row--on"><app-icon class="row__i" name="user" [size]="16" /><span>Profil</span></a>
        <a class="row" routerLink="/app/parametres/securite" routerLinkActive="row--on"><app-icon class="row__i" name="shield" [size]="16" /><span>Sécurité</span></a>
        <div class="head">Espaces de travail</div>
        <a class="row" routerLink="/app/parametres/espaces" routerLinkActive="row--on"><app-icon class="row__i" name="grid" [size]="16" /><span>Mes espaces</span></a>
        <div class="head">Administration</div>
        <a class="row" routerLink="/app/parametres/general" routerLinkActive="row--on"><app-icon class="row__i" name="building" [size]="16" /><span>Général</span></a>
        <a class="row" routerLink="/app/parametres/membres" routerLinkActive="row--on"><app-icon class="row__i" name="teams" [size]="16" /><span>Membres</span></a>
        <a class="row" routerLink="/app/parametres/invitations" routerLinkActive="row--on"><app-icon class="row__i" name="mail" [size]="16" /><span>Invitations</span></a>
      }
    }

    <!-- projets template (shared) -->
    <ng-template #projets>
      <button class="row row--arch" routerLink="/app/projets/archives">
        <app-icon class="row__i" name="archive" [size]="15" /><span>Projets archivés</span>
      </button>
      <button class="primary" (click)="createProject.emit()"><app-icon name="plus" [size]="16" />Nouveau projet</button>
      <button class="search"><app-icon name="search" [size]="15" /><input placeholder="Rechercher un projet…" /></button>
      <div class="head">Tous les projets</div>
      @for (p of projects(); track p.id) {
        <a class="row" [routerLink]="['/app/projets', p.id]" routerLinkActive="row--on">
          <span class="dot" [style.background]="p.color"></span><span style="flex:1">{{ p.name }}</span><span class="row__pct">{{ p.progress }}%</span>
        </a>
      }
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .row { width: 100%; display: flex; align-items: center; gap: 9px; padding: 8px 10px; border: none; cursor: pointer;
      border-radius: 8px; text-align: left; background: transparent; color: var(--nx-text-600); font-size: 13.5px; font-weight: 500;
      font-family: inherit; margin-bottom: 1px; text-decoration: none; }
    .row:hover { background: var(--nx-surface-2); }
    .row--on { background: rgba(91,95,233,0.10); color: var(--nx-indigo-text); font-weight: 600; }
    .row--on:hover { background: rgba(91,95,233,0.10); }
    .row--sub { padding-left: 30px; }
    .row__i { color: var(--nx-text-400); display: flex; flex: none; }
    .row--on .row__i { color: var(--nx-indigo); }
    .row > span:not(.dot):not(.row__badge):not(.row__pct):not(.chev2) { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row__badge { font-size: 11px; color: var(--nx-text-500); font-weight: 600; }
    .row__pct { font-size: 11px; color: var(--nx-text-500); font-weight: 600; }
    .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
    .head { font-size: 11px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--nx-text-400); padding: 12px 8px 6px; }
    .head--row { display: flex; align-items: center; justify-content: space-between; }
    .add { width: 24px; height: 24px; border: none; border-radius: 6px; background: transparent; color: var(--nx-text-400); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .add:hover { background: #E8E5DE; color: var(--nx-text-600); }
    .chev, .chev2 { display: flex; color: var(--nx-text-400); background: none; border: none; cursor: pointer; }
    .chev2 { transition: transform .15s; margin-left: auto; }
    .sub { border-left: 2px solid var(--nx-border); margin-left: 18px; padding-left: 6px; }
    .primary { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 36px; margin: 2px 2px 8px;
      border: none; border-radius: 8px; background: var(--nx-indigo); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; box-shadow: var(--nx-shadow-primary); }
    .row--arch { justify-content: center; height: 34px; margin: 2px 2px 8px; border: 1px solid var(--nx-border); color: var(--nx-text-500); font-size: 12.5px; font-weight: 600; }
    .row--arch span { flex: none; }
    .search { width: 100%; display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 11px; margin: 2px 2px 8px; border: none; border-radius: 8px; background: var(--nx-surface-2); color: var(--nx-text-400); }
    .search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13px; color: var(--nx-text); }
    .row--group { font-weight: 600; }
    .row--actifs { margin-bottom: 2px; }
    .conv { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px; border: none; background: transparent; border-radius: 9px; cursor: pointer; text-align: left; margin-bottom: 1px; text-decoration: none; }
    .conv:hover { background: var(--nx-surface-2); }
    .conv--on { background: rgba(91,95,233,0.10); }
    .conv__av { width: 34px; height: 34px; flex: none; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
    .conv__t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .conv__n { font-size: 13px; font-weight: 600; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .conv__m { font-size: 12px; color: var(--nx-text-400); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .conv__u { min-width: 17px; height: 17px; padding: 0 5px; border-radius: 9px; background: var(--nx-indigo); color: #fff; font-size: 10.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  `],
})
export class Sidebar2Component {
  @Input() section = 'accueil';
  @Output() invite = new EventEmitter<void>();
  @Output() createProject = new EventEmitter<void>();
  @Output() newMessage = new EventEmitter<void>();
  @Output() newChannel = new EventEmitter<'org' | 'project'>();

  private projectsSvc = inject(ProjectsService);
  projects = toSignal(this.projectsSvc.list(), { initialValue: [] as Project[] });
  docsProjOpen = signal(true);
  canauxGrp = signal(true);

  convos = [
    { id: 'sarah-diallo', name: 'Sarah Diallo', msg: "Je t'envoie la maquette ce soir", color: '#F2693C', initials: 'SD', unread: 2 },
    { id: 'moussa-ba',    name: 'Moussa Bâ',    msg: 'Parfait, merci',                color: '#6C70F0', initials: 'MB', unread: 0 },
    { id: 'aida-ndiaye',  name: 'Aïda Ndiaye',  msg: 'On cale un point demain ?',      color: '#2BB673', initials: 'AN', unread: 0 },
    { id: 'equipe-design', name: 'Équipe Design', msg: 'Yacine: PR mergée',            color: '#E0497B', initials: 'ED', unread: 0 },
  ];

  toggleDocsProj(e: Event): void { e.preventDefault(); e.stopPropagation(); this.docsProjOpen.set(!this.docsProjOpen()); }
}
