import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChallengeApiService } from '../../core/services/challenge-api.service';
import { Challenge } from '../../core/models/challenge.model';
import { AuthService } from '../../core/auth/auth.service';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { StatusStepperComponent } from './status-stepper/status-stepper.component';
import { ProblemStatementPanelComponent } from './problem-statement-panel/problem-statement-panel.component';
import { SolutionOptionsPanelComponent } from './solution-options-panel/solution-options-panel.component';

type DetailPanel = 'problem-statement' | 'solution-options' | 'none';

@Component({
  selector: 'app-challenge-detail',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatProgressSpinnerModule,
    StatusBadgeComponent,
    StatusStepperComponent,
    ProblemStatementPanelComponent,
    SolutionOptionsPanelComponent,
  ],
  templateUrl: './challenge-detail.component.html',
  styleUrl: './challenge-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly challengeApi = inject(ChallengeApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly challenge = signal<Challenge | null>(null);
  readonly loadFailed = signal(false);

  // A challenge's content is owned; its workflow is shared. This mirrors the
  // API's rule so the UI doesn't offer writes that would 403 — it is an
  // affordance, not a security boundary.
  readonly canEdit = computed(() => {
    const challenge = this.challenge();
    const user = this.auth.currentUser();
    if (challenge === null || user === null) {
      return false;
    }
    return this.auth.isAdmin() || challenge.submittedByUserId === user.id;
  });

  // Shown only on a challenge that isn't yours. No admin gate is needed: a
  // collaborator's list is scoped to their own challenges, so this renders for
  // an admin browsing the unscoped list, and for anyone who opens a peer's
  // challenge by URL.
  readonly authorName = computed(() => {
    const challenge = this.challenge();
    const user = this.auth.currentUser();
    if (challenge === null || user === null || challenge.submittedByUserId === user.id) {
      return null;
    }
    return challenge.submittedByName;
  });

  readonly currentPanel = computed<DetailPanel>(() => {
    switch (this.challenge()?.status) {
      case 'Submitted':
        return 'problem-statement';
      case 'ProblemStatementDrafted':
      case 'OptionsDrafted':
      case 'OptionSelected':
        return 'solution-options';
      // ponytail: catch-all default, so adding a ChallengeStatus compiles clean
      // and silently renders no panel for it. The 7-case parameterized test in
      // this component's spec is the exhaustiveness guard — it fails when the
      // union grows. Swap in a `never` check here if that guard isn't enough.
      default:
        return 'none';
    }
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.challengeApi.getChallenge(id).subscribe({
      next: (challenge) => this.challenge.set(challenge),
      // The error interceptor shows a snackbar for 5xx but leaves component
      // state alone, so without this the spinner would spin forever on a 404.
      error: () => this.loadFailed.set(true),
    });
  }

  onChallengeUpdated(updated: Challenge): void {
    this.challenge.set(updated);
  }

  onDelete(challenge: Challenge): void {
    // Deletion is immediate and cascades this challenge's options — there is no
    // undo, so this prompt is the only thing between a mis-click and a removed
    // row. Same call the user-management view makes, for the same reason.
    if (!confirm(`Delete "${challenge.title}"?`)) {
      return;
    }

    this.challengeApi.deleteChallenge(challenge.id).subscribe({
      next: () => this.router.navigate(['/challenges']),
      error: (err: HttpErrorResponse) => {
        // 404 means someone else deleted it first, so the user's goal is already
        // met — reporting a failure would be wrong. 401/403/5xx are surfaced by
        // errorHandlingInterceptor, so there is nothing to add for them here.
        if (err.status === 404) {
          this.router.navigate(['/challenges']);
        }
      },
    });
  }
}
