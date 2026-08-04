import { ChangeDetectionStrategy, Component, Signal, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChallengeApiService } from '../../core/services/challenge-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Challenge, ChallengeStatus } from '../../core/models/challenge.model';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

const ALL_STATUSES: ChallengeStatus[] = [
  'Submitted',
  'ProblemStatementDrafted',
  'OptionsDrafted',
  'OptionSelected',
  'InReview',
  'Approved',
  'Rejected',
];

@Component({
  selector: 'app-challenge-list',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    StatusBadgeComponent,
  ],
  templateUrl: './challenge-list.component.html',
  styleUrl: './challenge-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengeListComponent {
  private readonly challengeApi = inject(ChallengeApiService);
  private readonly auth = inject(AuthService);

  readonly statuses = ALL_STATUSES;
  readonly statusFilter = signal<ChallengeStatus | null>(null);

  // Re-fetches whenever the signed-in user or the status filter changes. The
  // resource supersedes any in-flight request.
  private readonly challengesResource = this.challengeApi.challengesResource(() => ({
    status: this.statusFilter(),
    userId: this.auth.currentUser()?.id ?? null,
  }));

  readonly challenges: Signal<Challenge[]> = this.challengesResource.value;
  readonly loading: Signal<boolean> = this.challengesResource.isLoading;

  onFilterChange(status: ChallengeStatus | null): void {
    this.statusFilter.set(status);
  }
}
