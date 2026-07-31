import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChallengeApiService } from '../../core/services/challenge-api.service';
import { Challenge } from '../../core/models/challenge.model';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { StatusStepperComponent } from './status-stepper/status-stepper.component';
import { ProblemStatementPanelComponent } from './problem-statement-panel/problem-statement-panel.component';
import { SolutionOptionsPanelComponent } from './solution-options-panel/solution-options-panel.component';

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

  readonly challenge = signal<Challenge | null>(null);
  readonly loadFailed = signal(false);

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
