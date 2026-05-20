import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

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
      { path: 'dashboard',    loadComponent: () => import('@views/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'projects',     loadComponent: () => import('@views/projects/kanban/kanban.component').then(m => m.KanbanComponent) },
      { path: 'ged',          loadComponent: () => import('@views/ged/ged.component').then(m => m.GedComponent) },
      { path: 'messaging',    loadComponent: () => import('@views/messaging/messaging.component').then(m => m.MessagingComponent) },
      { path: 'meetings',     loadComponent: () => import('@views/meeting/meeting.component').then(m => m.MeetingComponent) },
      { path: 'notifications', loadComponent: () => import('@views/notifications/notifications.component').then(m => m.NotificationsComponent) },
      { path: 'profile',      loadComponent: () => import('@views/profile/profile.component').then(m => m.ProfileComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
