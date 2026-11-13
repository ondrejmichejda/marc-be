import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./features/layout/app-layout.component').then(m => m.AppLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'fss',
      },
      {
        path: 'fss',
        loadComponent: () => import('./features/fss/fss-list.component').then(m => m.FssListComponent),
      },
      {
        path: 'fss-prompts',
        loadComponent: () => import('./features/fss/fss-prompts.component').then(m => m.FssPromptsComponent),
      },
      {
        path: 'fss-templates',
        loadComponent: () => import('./features/fss/fss-prompts.component').then(m => m.FssPromptsComponent),
      },
      {
        path: 'ai-settings',
        loadComponent: () => import('./features/ai-settings/user-ai-settings.component').then(m => m.UserAiSettingsComponent),
      },
      {
        path: 'prompts',
        loadComponent: () => import('./features/prompts/ai-prompts.component').then(m => m.AiPromptsComponent),
      },
      {
        path: 'system',
        loadComponent: () => import('./features/system/system-admin.component').then(m => m.SystemAdminComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
