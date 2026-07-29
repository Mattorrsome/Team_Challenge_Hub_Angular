import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'challenges', pathMatch: 'full' },
  {
    path: 'challenges',
    loadComponent: () =>
      import('./features/challenge-list/challenge-list.component').then(
        (m) => m.ChallengeListComponent,
      ),
  },
  {
    path: 'challenges/new',
    loadComponent: () =>
      import('./features/challenge-form/challenge-form.component').then(
        (m) => m.ChallengeFormComponent,
      ),
    data: { mode: 'create' },
  },
  {
    path: 'challenges/:id/edit',
    loadComponent: () =>
      import('./features/challenge-form/challenge-form.component').then(
        (m) => m.ChallengeFormComponent,
      ),
    data: { mode: 'edit' },
  },
  {
    path: 'challenges/:id',
    loadComponent: () =>
      import('./features/challenge-detail/challenge-detail.component').then(
        (m) => m.ChallengeDetailComponent,
      ),
  },
];
