import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ProjectsService } from '@core/services/projects.service';
import { ConversationsService } from '@core/services/conversations.service';
import { ChannelsService } from '@core/services/channels.service';
import { AccueilService } from '@core/services/accueil.service';
import { MembersService } from '@core/services/members.service';
import { ReceivedMention } from '@core/models/accueil.models';
import { Member } from '@core/models/member.models';
import { SessionService } from '@core/services/session.service';
import { ArchivedProjectsService } from '@core/services/archived-projects.service';
import { DataRefreshService } from '@core/services/data-refresh.service';
import { ToastService } from '@core/services/toast.service';
import { ShellBus } from '@layouts/app-shell/shell.bus';
import { Project } from '@core/models/project.models';
import { Conversation } from '@core/models/conversation.models';
import { Channel } from '@core/models/channel.models';
import { workspaceQuery, workspaceSignal } from '@core/util/workspace-signal';

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
          <app-icon class="row__i" name="at" [size]="16" /><span>Mentions reçues</span>@if (mentionsCount() > 0) { <span class="row__badge">{{ mentionsCount() }}</span> }
        </a>
        @if (isAdmin()) {
          <a class="row" routerLink="/app/accueil/tableau-de-bord" routerLinkActive="row--on">
            <app-icon class="row__i" name="dashboard" [size]="16" /><span>Tableau de bord</span>
          </a>
        }
      }

      <!-- ============ PROJETS / ÉQUIPES ============ -->
      @case ('projets') { <ng-container *ngTemplateOutlet="projets"></ng-container> }
      @case ('equipes') {
        <button class="search">
          <app-icon name="search" [size]="15" />
          <input [value]="equipesQ()" (input)="equipesQ.set($any($event.target).value)" placeholder="Rechercher une équipe…" aria-label="Rechercher une équipe" />
        </button>
        <div class="head">Projets du workspace</div>
        @for (p of filteredEquipesProjects(); track p.id) {
          @let isCurrent = p.id === equipesActiveProjectId();
          @let isParent = isCurrent && !!openTeam();
          <a class="row" routerLink="/app/equipes" [queryParams]="{ project: p.id }"
             [class.row--on]="isCurrent && !openTeam()">
            <span class="dot" [style.background]="p.color"></span>
            <span style="flex:1">{{ p.name }}</span>
          </a>
          @if (isParent) {
            <div class="eqsub">
              <a class="eqsub__i" routerLink="/app/equipes" [queryParams]="{ project: p.id }">
                <span class="eqsub__n">{{ openTeam()!.name }}</span>
                <span class="eqsub__m">Équipe · {{ openTeam()!.project }}</span>
              </a>
            </div>
          }
        } @empty {
          <div class="empty">Aucun projet trouvé.</div>
        }
      }

      <!-- ============ DOCUMENTS ============ -->
      @case ('documents') {
        <a class="row" routerLink="/app/documents/mes-documents" routerLinkActive="row--on">
          <app-icon class="row__i" name="file" [size]="16" /><span>Mes documents</span>
        </a>
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
        @if (archivedPreview(); as ap) {
          <!-- Aperçu temporaire lié à un canal d'un projet archivé (admin only).
               La sidebar est réduite à l'essentiel : badge, nom du projet et un
               bouton pour revenir à l'onglet Canaux du projet archivé. -->
          <div class="archbox">
            <span class="archbox__badge"><app-icon name="lock" [size]="12" />Projet archivé</span>
            <div class="archbox__name" [title]="ap.projectName">{{ ap.projectName }}</div>
            <button class="archbox__exit" (click)="backToArchivedProject(ap)">
              <app-icon name="chevronLeft" [size]="14" [stroke]="2.2" />
              <span>Retour au projet archivé</span>
            </button>
          </div>
        } @else {
        <button class="search">
          <app-icon name="search" [size]="15" />
          <input [value]="canalQ()" (input)="canalQ.set($any($event.target).value)"
                 placeholder="Rechercher un canal…" aria-label="Rechercher un canal" />
        </button>

        @if (channelsBusy()) { <div class="sync" role="status"><span class="spin"></span>Mise à jour…</div> }

        <div class="head head--row"><span>Canaux Organisation</span>
          @if (isAdmin()) {
            <button class="add" (click)="newChannel.emit('org')" title="Ajouter un canal"><app-icon name="plus" [size]="16" /></button>
          }
        </div>
        @for (c of filteredOrg(); track c.id) {
          <div class="chwrap" [class.stale]="channelsBusy()">
            <a class="row row--ch" [routerLink]="['/app/canaux', c.id]" routerLinkActive="row--on">
              <app-icon class="row__i" [name]="c.kind" [size]="16" />
              <span>{{ c.name }}</span>
              @if (isPrivate(c.id)) { <span class="lock" title="Canal privé"><app-icon name="lock" [size]="13" /></span> }
            </a>
            @if (isAdmin()) {
              <button class="dots" [class.dots--on]="menuId()===c.id"
                      (click)="toggleMenu(c.id, $event)" title="Options du canal">⋯</button>
              @if (menuId()===c.id) {
                <div class="menubd" (click)="menuId.set(null)"></div>
                <div class="menu" (click)="$event.stopPropagation()">
                  <button class="menu__i" (click)="edit(c)"><app-icon name="edit" [size]="15" /><span>Modifier</span></button>
                  <button class="menu__i" (click)="access(c)"><app-icon name="lock" [size]="15" /><span>Gérer les accès</span></button>
                  <div class="menu__sep"></div>
                  <button class="menu__i menu__i--danger" (click)="del(c)"><app-icon name="trash" [size]="15" /><span>Supprimer</span></button>
                </div>
              }
            }
          </div>
        } @empty {
          @if (canalQ().trim() && orgChannels().length > 0) {
            <div class="chempty">Aucun canal ne correspond à votre recherche.</div>
          } @else if (isAdmin()) {
            <div class="chempty">Aucun canal — utilisez + pour en créer un.</div>
          } @else {
            <div class="chempty">Aucun canal d'organisation pour le moment.</div>
          }
        }

        @if (projectChannelName()) {
          <div class="head head--row"><span>Canaux Projets</span></div>
          <button class="row row--group" (click)="canauxGrp.set(!canauxGrp())">
            <app-icon class="row__i" name="projects" [size]="16" /><span>{{ projectChannelName() }}</span>
            @if (canManageProjectChannels()) {
              <button class="add" (click)="newChannel.emit('project'); $event.stopPropagation()" title="Ajouter un canal"><app-icon name="plus" [size]="16" /></button>
            }
            <span class="chev2" [style.transform]="canauxGrp() ? '' : 'rotate(-90deg)'"><app-icon name="chevronDown" [size]="15" /></span>
          </button>
          @if (canauxGrp()) {
            @for (c of filteredProject(); track c.id) {
              <div class="chwrap chwrap--sub" [class.stale]="channelsBusy()">
                <a class="row row--sub row--ch" [routerLink]="['/app/canaux', c.id]" routerLinkActive="row--on">
                  <app-icon class="row__i" [name]="c.kind" [size]="16" />
                  <span>{{ c.name }}</span>
                  @if (isPrivate(c.id)) { <span class="lock" title="Canal privé"><app-icon name="lock" [size]="13" /></span> }
                </a>
                @if (canManageProjectChannels()) {
                  <button class="dots dots--sub" [class.dots--on]="menuId()===c.id"
                          (click)="toggleMenu(c.id, $event)" title="Options du canal">⋯</button>
                  @if (menuId()===c.id) {
                    <div class="menubd" (click)="menuId.set(null)"></div>
                    <div class="menu menu--sub" (click)="$event.stopPropagation()">
                      <button class="menu__i" (click)="edit(c)"><app-icon name="edit" [size]="15" /><span>Modifier</span></button>
                      <button class="menu__i" (click)="access(c)"><app-icon name="lock" [size]="15" /><span>Gérer les accès</span></button>
                      <div class="menu__sep"></div>
                      <button class="menu__i menu__i--danger" (click)="del(c)"><app-icon name="trash" [size]="15" /><span>Supprimer</span></button>
                    </div>
                  }
                }
              </div>
            } @empty {
              @if (canalQ().trim() && projectChannels().length > 0) {
                <div class="chempty">Aucun canal ne correspond à votre recherche.</div>
              } @else if (canManageProjectChannels()) {
                <div class="chempty">Aucun canal — utilisez + pour en créer un.</div>
              } @else {
                <div class="chempty">Aucun canal projet pour le moment.</div>
              }
            }
          }
        }
        }
      }

      <!-- ============ CONVERSATIONS ============ -->
      @case ('conversations') {
        <button class="primary" (click)="newMessage.emit()"><app-icon name="plus" [size]="16" />Nouveau message</button>
        <a class="row row--actifs" routerLink="/app/conversations/actifs" routerLinkActive="row--on">
          <span class="dot" style="background:var(--nx-success)"></span><span style="flex:1">En ligne</span>@if (onlineCount() > 0) { <span class="row__badge">{{ onlineCount() }}</span> }
        </a>
        <div class="head">Conversations</div>
        <button class="search">
          <app-icon name="search" [size]="15" />
          <input [value]="bus.conversationSearch()"
                 (input)="bus.conversationSearch.set($any($event.target).value)"
                 [placeholder]="isActifsRoute() ? 'Rechercher un membre…' : 'Rechercher…'"
                 aria-label="Rechercher" />
        </button>
        @for (c of filteredConvos(); track c.id) {
          <div class="convwrap">
            <a class="conv" [routerLink]="['/app/conversations', c.id]" routerLinkActive="conv--on">
              <span class="conv__av" [style.background]="c.color">{{ c.initials }}</span>
              <span class="conv__t"><span class="conv__n">{{ c.name }}</span><span class="conv__m">{{ c.msg }}</span></span>
              <span class="conv__r">
                <span class="conv__time">{{ c.time }}</span>
                @if (c.unread) { <span class="conv__u">{{ c.unread }}</span> }
              </span>
            </a>
            <button class="dots dots--conv" [class.dots--on]="convMenuId()===c.id"
                    (click)="toggleConvMenu(c.id, $event)" title="Options de la conversation">⋯</button>
            @if (convMenuId()===c.id) {
              <div class="menubd" (click)="convMenuId.set(null)"></div>
              <div class="menu" (click)="$event.stopPropagation()">
                <button class="menu__i menu__i--danger" (click)="deleteConv(c)">
                  <app-icon name="trash" [size]="15" /><span>Supprimer</span>
                </button>
              </div>
            }
          </div>
        } @empty {
          <div class="empty">Aucune conversation.</div>
        }
      }

      <!-- ============ RÉUNIONS ============ -->
      @case ('reunions') {
        <a class="row" routerLink="/app/reunions/lancer" routerLinkActive="row--on">
          <app-icon class="row__i" name="video" [size]="16" /><span>Lancer une réunion</span>
        </a>
        <!-- « Historique discussion » — perd sa mise en avant dès qu'une discussion précise est ouverte (exact match). -->
        <a class="row" routerLink="/app/reunions/historique"
           routerLinkActive="row--on" [routerLinkActiveOptions]="{ exact: true }">
          <app-icon class="row__i" name="clock" [size]="16" /><span>Historique discussion</span>
        </a>
        @if (openMeeting(); as m) {
          <!-- Réunion actuellement ouverte : bloc imbriqué, fidèle au prototype. -->
          <div class="mtgsub">
            <a class="mtgsub__i" [routerLink]="['/app/reunions/historique', m.id]">
              <span class="mtgsub__n">{{ m.name }}</span>
              <span class="mtgsub__m">Réunion{{ m.proj ? ' · ' + m.proj : '' }}{{ m.proj && m.date ? ' · ' : (m.date ? ' · ' : '') }}{{ m.date }}</span>
            </a>
          </div>
        }
      }

      <!-- ============ PARAMÈTRES ============ -->
      @case ('parametres') {
        <div class="head">Compte</div>
        <a class="row" routerLink="/app/parametres/profil" routerLinkActive="row--on"><app-icon class="row__i" name="user" [size]="16" /><span>Profil</span></a>
        <a class="row" routerLink="/app/parametres/securite" routerLinkActive="row--on"><app-icon class="row__i" name="shield" [size]="16" /><span>Sécurité</span></a>
        <div class="head">Espaces de travail</div>
        <a class="row" routerLink="/app/parametres/espaces" routerLinkActive="row--on"><app-icon class="row__i" name="grid" [size]="16" /><span>Mes espaces</span></a>
        @if (isAdmin()) {
          <div class="head">Administration</div>
          <a class="row" routerLink="/app/parametres/general" routerLinkActive="row--on"><app-icon class="row__i" name="building" [size]="16" /><span>Général</span></a>
          <a class="row" routerLink="/app/parametres/membres" routerLinkActive="row--on"><app-icon class="row__i" name="teams" [size]="16" /><span>Membres</span></a>
          <a class="row" routerLink="/app/parametres/invitations" routerLinkActive="row--on"><app-icon class="row__i" name="mail" [size]="16" /><span>Invitations</span></a>
        }
      }
    }

    <!-- projets template (shared) -->
    <ng-template #projets>
      @if (isAdmin()) {
        <button class="row row--arch" routerLink="/app/projets/archives">
          <app-icon class="row__i" name="archive" [size]="15" /><span>Projets archivés</span>
        </button>
        <button class="primary" (click)="createProject.emit()"><app-icon name="plus" [size]="16" />Nouveau projet</button>
      }
      <button class="search">
        <app-icon name="search" [size]="15" />
        <input [value]="projQ()" (input)="projQ.set($any($event.target).value)" placeholder="Rechercher un projet…" aria-label="Rechercher un projet" />
      </button>
      <div class="head head--row">
        <span>Tous les projets</span>
        @if (projectsBusy()) { <span class="spin" aria-hidden="true"></span> }
      </div>
      @if (projectsBusy()) { <div class="sync" role="status">Mise à jour…</div> }
      <div [class.stale]="projectsBusy()">
        @for (p of filteredProjects(); track p.id) {
          <a class="row" [routerLink]="['/app/projets', p.id]" routerLinkActive="row--on">
            <span class="dot" [style.background]="p.color"></span><span style="flex:1">{{ p.name }}</span>
          </a>
        } @empty {
          @if (!projectsBusy()) { <div class="empty">Aucun projet trouvé.</div> }
        }
      </div>
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
    .row > span:not(.dot):not(.row__badge):not(.row__pct):not(.chev2):not(.lock) { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row__badge { font-size: 11px; color: var(--nx-text-500); font-weight: 600; }
    .row__pct { font-size: 11px; color: var(--nx-text-500); font-weight: 600; }
    .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
    /* Équipe ouverte : bloc imbriqué sous le projet (fidèle au prototype) */
    .eqsub { margin-left: 18px; border-left: 2px solid var(--nx-border-card); padding-left: 8px; padding-bottom: 3px; }
    .eqsub__i { width: 100%; display: flex; flex-direction: column; gap: 2px; padding: 7px 8px; border: none; border-radius: 8px;
      background: rgba(91,95,233,0.10); cursor: pointer; text-decoration: none; }
    .eqsub__i:hover { background: rgba(91,95,233,0.14); }
    .eqsub__n { font-size: 13px; font-weight: 600; color: #3d3aa8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .eqsub__m { font-size: 11px; color: var(--nx-text-500); }
    /* Réunion actuellement ouverte : bloc imbriqué sous « Historique discussion » (fidèle au prototype). */
    .mtgsub { margin-left: 18px; border-left: 2px solid var(--nx-border-card); padding-left: 8px; padding-bottom: 3px; }
    .mtgsub__i { width: 100%; display: flex; flex-direction: column; gap: 2px; padding: 7px 8px; border: none; border-radius: 8px;
      background: rgba(91,95,233,0.10); cursor: pointer; text-decoration: none; font-family: inherit; text-align: left; }
    .mtgsub__i:hover { background: rgba(91,95,233,0.14); }
    .mtgsub__n { font-size: 13px; font-weight: 600; color: #3d3aa8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: block; }
    .mtgsub__m { font-size: 11px; color: var(--nx-text-500); line-height: 1.4; display: block; }
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
    .search { width: 100%; display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 11px; margin: 2px 2px 8px; border: 1px solid #DDD9D1; border-radius: 9px; background: #fff; color: var(--nx-text-400); }
    .search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 12.5px; color: var(--nx-text); }
    .search input::placeholder { color: var(--nx-text-400); }
    .empty { padding: 10px 12px; font-size: 12.5px; color: var(--nx-text-400); }
    .row--group { font-weight: 600; }

    /* ─── Mise à jour en cours (mutation + rechargement) ─────────────────────
       La liste affichée est périmée le temps que le serveur réponde : on l'estompe
       et on l'annonce, plutôt que de laisser croire que l'action n'a rien fait. */
    .sync { display: flex; align-items: center; gap: 7px; padding: 6px 10px; margin: 0 2px 6px;
      font-size: 12px; font-weight: 600; color: var(--nx-text-500); background: var(--nx-surface-2);
      border-radius: 8px; }
    .stale { opacity: .45; pointer-events: none; transition: opacity .12s; }
    .spin { width: 12px; height: 12px; flex: none; border-radius: 50%;
      border: 2px solid var(--nx-border); border-top-color: var(--nx-indigo);
      animation: nx-spin .6s linear infinite; }
    @keyframes nx-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .spin { animation-duration: 2s; } }

    /* Channels: row + trailing dots + private lock */
    .chwrap { position: relative; }
    .chwrap--sub { }
    .row--ch { padding-right: 32px; }
    .lock { display: flex; flex: none; color: var(--nx-text-300); margin-left: auto; }
    .dots { position: absolute; top: 6px; right: 4px; width: 24px; height: 24px; border: none; border-radius: 6px; background: transparent; color: var(--nx-text-400); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; line-height: 1; padding: 0; }
    .dots--sub { top: 5px; }
    .dots:hover, .dots--on { background: #E8E5DE; }
    .menubd { position: fixed; inset: 0; z-index: 60; }
    .menu { position: absolute; top: 34px; right: 4px; z-index: 61; width: 194px; background: #fff; border-radius: 11px; border: 1px solid #ECEAE4; box-shadow: 0 14px 38px rgba(20,15,40,.18); padding: 6px; }
    .menu--sub { top: 30px; }
    .menu__i { width: 100%; box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: none; border-radius: 8px; background: transparent; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500; color: var(--nx-text-700); text-align: left; }
    .menu__i:hover { background: var(--nx-surface-2); }
    .menu__i app-icon { color: var(--nx-text-400); display: flex; flex: none; }
    .menu__i--danger { color: var(--nx-danger); }
    .menu__i--danger app-icon { color: var(--nx-danger); }
    .menu__i--danger:hover { background: #FDECEB; }
    .menu__sep { height: 1px; background: #F0EEE9; margin: 5px 6px; }
    .chempty { padding: 4px 10px 8px 12px; font-size: 12px; color: var(--nx-text-300); font-style: italic; }

    /* Archived-project preview box — minimalist: badge, project name, back. */
    .archbox { margin: 4px 0 8px; padding: 12px 12px 10px; border: 1px solid #E9D890; background: #FFF9E6; border-radius: 10px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
    .archbox__badge { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: #7A5B00; background: #FCE9AC; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: .04em; }
    .archbox__name { width: 100%; font-size: 14px; font-weight: 700; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
    .archbox__exit { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; border: 1px solid #E2D290; background: #fff; color: var(--nx-text-700); font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: 8px; cursor: pointer; }
    .archbox__exit:hover { background: var(--nx-surface-2); }

    .row--actifs { margin-bottom: 2px; }
    .convwrap { position: relative; margin-bottom: 1px; }
    .conv { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 32px 8px 8px; border: none; background: transparent; border-radius: 9px; cursor: pointer; text-align: left; text-decoration: none; }
    .conv:hover { background: var(--nx-surface-2); }
    .conv--on { background: rgba(91,95,233,0.10); }
    .conv__av { width: 34px; height: 34px; flex: none; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
    .conv__t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .conv__n { font-size: 13px; font-weight: 600; color: var(--nx-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .conv__m { font-size: 12px; color: var(--nx-text-400); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .conv__r { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex: none; }
    .conv__time { font-size: 10.5px; color: var(--nx-text-300); }
    .conv__u { min-width: 17px; height: 17px; padding: 0 5px; border-radius: 9px; background: var(--nx-indigo); color: #fff; font-size: 10.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .dots--conv { top: 8px; }
    .convwrap:hover .dots--conv, .dots--on { opacity: 1; }
    .dots--conv { opacity: 0; transition: opacity .12s; }
    .dots--conv.dots--on { opacity: 1; }
  `],
})
export class Sidebar2Component {
  @Input() section = 'accueil';
  @Output() invite = new EventEmitter<void>();
  @Output() createProject = new EventEmitter<void>();
  @Output() newMessage = new EventEmitter<void>();
  @Output() newChannel = new EventEmitter<'org' | 'project'>();

  private projectsSvc = inject(ProjectsService);
  private session = inject(SessionService);
  private router = inject(Router);
  private toast = inject(ToastService);
  bus = inject(ShellBus);
  private channelsSvc = inject(ChannelsService);
  private accueilSvc = inject(AccueilService);
  private membersSvc = inject(MembersService);
  /** True when current user is ADMIN or OWNER of the active workspace. */
  isAdmin = this.session.isAdmin;

  /** Nombre réel de mentions reçues (badge « Mentions reçues »). */
  private mentionsList = workspaceSignal<ReceivedMention[]>(this.session, () => this.accueilSvc.mentions(), []);
  mentionsCount = computed(() => this.mentionsList().length);
  /** Nombre réel de membres en ligne (badge « En ligne » des conversations). */
  private onlineList = workspaceSignal<Member[]>(this.session, () => this.membersSvc.online(), []);
  onlineCount = computed(() => this.onlineList().length);
  /** Team currently opened in the Équipes space (rendered under its project). */
  openTeam = this.bus.openTeamNav;
  /** Meeting whose discussion is currently open — rendered under « Historique discussion ». */
  openMeeting = this.bus.openMeetingNav;
  private refresh = inject(DataRefreshService);
  private projectsQuery = workspaceQuery<Project[]>(this.session, () => this.projectsSvc.list(), [], this.refresh.projects);
  private rawProjects = this.projectsQuery.value;
  private projectsMutating = this.refresh.busy('projects');
  /**
   * Vrai pendant TOUTE la fenêtre où la liste affichée est périmée : de l'envoi de
   * la mutation (`busy`) jusqu'à la fin du rechargement qu'elle déclenche
   * (`loading`). Sans quoi l'utilisateur voit le toast de confirmation alors que
   * l'élément est encore listé, et croit à une anomalie.
   */
  projectsBusy = computed(() => this.projectsMutating() || this.projectsQuery.loading());
  /** Active projects only — archived ones are hidden from every sidebar list (REF E). */
  projects = computed<Project[]>(() => {
    const archived = this.archivedSvc.ids();
    return this.rawProjects().filter(p => !archived.has(p.id));
  });
  projQ = signal('');
  /** Project list filtered by the sidebar search query (case-insensitive). */
  filteredProjects = computed<Project[]>(() => {
    const q = this.projQ().toLowerCase().trim();
    const list = this.projects();
    if (!q) return list;
    return list.filter(p => p.name.toLowerCase().includes(q));
  });

  equipesQ = signal('');
  /** Same list under the "Équipes" section, filtered by its own search box. */
  filteredEquipesProjects = computed<Project[]>(() => {
    const q = this.equipesQ().toLowerCase().trim();
    const list = this.projects();
    if (!q) return list;
    return list.filter(p => p.name.toLowerCase().includes(q));
  });
  docsProjOpen = signal(true);
  canauxGrp = signal(true);

  private conversationsSvc = inject(ConversationsService);

  private allConvos = workspaceSignal<Conversation[]>(this.session, () => this.conversationsSvc.list(), []);
  /** Conversation list minus those hidden by the current user, filtered by the shared search query. */
  filteredConvos = computed<Conversation[]>(() => {
    const q = this.bus.conversationSearch().toLowerCase().trim();
    const deleted = this.conversationsSvc.deletedIds();
    const visible = this.allConvos().filter(c => !deleted.has(c.id));
    if (!q) return visible;
    return visible.filter(c => c.name.toLowerCase().includes(q));
  });
  convMenuId = signal<string | null>(null);
  /** True when the current URL is the "En ligne" sub-route of Conversations. */
  private _url = signal(this.router.url);
  isActifsRoute = computed(() => this._url().includes('/app/conversations/actifs'));
  /**
   * Project id currently displayed in the standalone Équipes rail — read from
   * the `?project=<id>` query param on `/app/equipes`. Falls back to the first
   * project of the workspace so that the "Actuel" highlight is always coherent.
   */
  equipesActiveProjectId = computed<string | null>(() => {
    const url = this._url();
    if (!url.startsWith('/app/equipes')) return null;
    const q = /\?project=([^&#]+)/.exec(url);
    if (q) return decodeURIComponent(q[1]);
    return this.projects()[0]?.id ?? null;
  });

  private channelsQuery = workspaceQuery<Channel[]>(this.session, () => this.channelsSvc.list(), [], this.refresh.channels);
  private channels = this.channelsQuery.value;
  private channelsMutating = this.refresh.busy('channels');
  /** Idem `projectsBusy`, pour la liste des canaux. */
  channelsBusy = computed(() => this.channelsMutating() || this.channelsQuery.loading());
  private archivedSvc = inject(ArchivedProjectsService);

  canalQ = signal('');
  menuId = signal<string | null>(null);

  /**
   * Visible channels: exclude private channels the user has no grant on
   * (REF F) and channels of archived projects (REF E — they remain reachable
   * only from the project's own Canaux tab).
   */
  private visibleChannels = computed<Channel[]>(() => {
    const archived = this.archivedSvc.ids();
    return this.channels()
      .filter(c => this.channelsSvc.hasAccess(c.id))
      .filter(c => !(c.scope === 'project' && c.project && archived.has(this.slugifyProject(c.project))));
  });

  orgChannels = computed<Channel[]>(() => this.visibleChannels().filter(c => c.scope === 'org'));
  projectChannels = computed<Channel[]>(() => this.visibleChannels().filter(c => c.scope === 'project'));
  /** Owning project name of the first project channel (sidebar group header). */
  projectChannelName = computed<string | null>(() => this.projectChannels()[0]?.project ?? null);
  /**
   * True when the user is allowed to create / edit / delete project channels
   * in the sidebar section (règle R15). Currently modelled as `isAdmin` +
   * placeholder for chef-de-projet status.
   */
  canManageProjectChannels = computed(() => this.session.isAdmin());

  /** Project name → slug id for archived-project lookup (mirrors the ids in ProjectsService). */
  private slugifyProject(name: string): string {
    return name.trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  filteredOrg = computed<Channel[]>(() => this.applyChanFilter(this.orgChannels()));
  filteredProject = computed<Channel[]>(() => this.applyChanFilter(this.projectChannels()));

  /**
   * Archived-project channels preview state — set by the archived project's
   * Canaux tab when an admin opens one of its channels. Only meaningful under
   * the /app/canaux rail; auto-cleared elsewhere.
   */
  archivedPreview = computed(() => {
    if (!this._url().startsWith('/app/canaux')) return null;
    return this.bus.archivedChannelsPreview();
  });

  private applyChanFilter(list: Channel[]): Channel[] {
    const q = this.canalQ().toLowerCase().trim();
    if (!q) return list;
    return list.filter(c => c.name.toLowerCase().includes(q));
  }

  /**
   * Take the user back to the archived project's Canaux tab where they came
   * from. We reopen it in read-only mode (`ro=1` + name) so the shell renders
   * the archived-project header (same context as when the channel was clicked).
   */
  backToArchivedProject(ap: { projectId: string; projectName: string }): void {
    this.bus.archivedChannelsPreview.set(null);
    this.router.navigate(['/app/projets', ap.projectId, 'canaux'], {
      queryParams: { ro: '1', name: ap.projectName },
    });
  }

  isPrivate(id: string): boolean { return this.channelsSvc.isPrivate(id); }

  toggleMenu(id: string, ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.menuId.set(this.menuId() === id ? null : id);
  }

  edit(c: Channel): void {
    this.menuId.set(null);
    this.bus.openEditChannel({ id: c.id, name: c.name, kind: c.kind });
  }
  access(c: Channel): void {
    this.menuId.set(null);
    this.bus.openAccessChannel({ id: c.id, name: c.name, scope: c.scope });
  }
  del(c: Channel): void {
    this.menuId.set(null);
    this.bus.openDeleteChannel({ id: c.id, name: c.name });
  }

  toggleDocsProj(e: Event): void { e.preventDefault(); e.stopPropagation(); this.docsProjOpen.set(!this.docsProjOpen()); }

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(e => {
        const url = e.urlAfterRedirects;
        this._url.set(url);
        // Auto-clear the archived-channels preview mode as soon as the user
        // leaves the Canaux rail. This ensures the archived project's channels
        // never leak into other sections and disappear on next Canaux visit.
        if (!url.startsWith('/app/canaux') && this.bus.archivedChannelsPreview()) {
          this.bus.archivedChannelsPreview.set(null);
        }
      });
  }

  toggleConvMenu(id: string, ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.convMenuId.set(this.convMenuId() === id ? null : id);
  }

  /**
   * Soft-delete on the current user's side. If the current conversation is
   * open, route to the first remaining conversation (or to "Actifs" otherwise).
   */
  deleteConv(c: Conversation): void {
    this.convMenuId.set(null);
    this.conversationsSvc.deleteForMe(c.id);
    this.toast.show({ message: 'Conversation avec ' + c.name + ' supprimée' });
    if (this.router.url.includes('/app/conversations/' + c.id)) {
      const next = this.filteredConvos()[0];
      this.router.navigate(['/app/conversations', next ? next.id : 'actifs']);
    }
  }
}
