import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'challenges', pathMatch: 'full' },
  {
    path: 'sign-in',
    loadComponent: () =>
      import('./features/auth/sign-in/sign-in.component').then((m) => m.SignInComponent),
  },
  {
    path: 'sign-up',
    loadComponent: () =>
      import('./features/auth/sign-up/sign-up.component').then((m) => m.SignUpComponent),
  },
  {
    path: 'challenges',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/challenge-list/challenge-list.component').then(
        (m) => m.ChallengeListComponent,
      ),
  },
  {
    path: 'challenges/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/challenge-form/challenge-form.component').then(
        (m) => m.ChallengeFormComponent,
      ),
    data: { mode: 'create' },
  },
  {
    path: 'challenges/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/challenge-form/challenge-form.component').then(
        (m) => m.ChallengeFormComponent,
      ),
    data: { mode: 'edit' },
  },
  {
    path: 'challenges/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/challenge-detail/challenge-detail.component').then(
        (m) => m.ChallengeDetailComponent,
      ),
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/user-management/user-management.component').then(
        (m) => m.UserManagementComponent,
      ),
  },
];
