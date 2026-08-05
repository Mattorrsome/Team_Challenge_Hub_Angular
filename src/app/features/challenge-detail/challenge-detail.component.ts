import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
}
