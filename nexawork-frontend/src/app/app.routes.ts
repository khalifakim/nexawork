import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { workspaceGuard } from '@core/guards/workspace.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () =>
      import('@layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      { path: 'login',    loadComponent: () => import('@views/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('@views/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: 'workspace/setup', loadComponent: () => import('@views/workspace/workspace-setup.component').then(m => m.WorkspaceSetupComponent) },
      { path: 'dashboard',       canActivate: [workspaceGuard], loadComponent: () => import('@views/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'projects',        canActivate: [workspaceGuard], loadComponent: () => import('@views/projects/kanban/kanban.component').then(m => m.KanbanComponent) },
      { path: 'teams',           canActivate: [workspaceGuard], loadComponent: () => import('@views/teams/teams.component').then(m => m.TeamsComponent) },
      { path: 'documents',       canActivate: [workspaceGuard], loadComponent: () => import('@views/ged/ged.component').then(m => m.GedComponent) },
      { path: 'ged',             redirectTo: 'documents', pathMatch: 'full' },
      { path: 'channels',        canActivate: [workspaceGuard], loadComponent: () => import('@views/channels/channels.component').then(m => m.ChannelsComponent) },
      { path: 'conversations',   canActivate: [workspaceGuard], loadComponent: () => import('@views/conversations/conversations.component').then(m => m.ConversationsComponent) },
      { path: 'messaging',       redirectTo: 'channels', pathMatch: 'full' },
      { path: 'meetings',        canActivate: [workspaceGuard], loadComponent: () => import('@views/meeting/meeting.component').then(m => m.MeetingComponent) },
      { path: 'notifications',   canActivate: [workspaceGuard], loadComponent: () => import('@views/notifications/notifications.component').then(m => m.NotificationsComponent) },
      { path: 'settings',        loadComponent: () => import('@views/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'profile',         redirectTo: 'settings', pathMatch: 'full' },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
