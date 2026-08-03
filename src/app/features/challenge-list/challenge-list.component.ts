import { ChangeDetectionStrategy, Component, Signal, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChallengeApiService } from '../../core/services/challenge-api.service';
import { UserContextService } from '../../core/user-context/user-context.service';
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
  private readonly userContext = inject(UserContextService);

  readonly statuses = ALL_STATUSES;
  readonly statusFilter = signal<ChallengeStatus | null>(null);

  // Re-fetches whenever the acting user or the status filter changes, so
  // switching users via the toolbar picker refreshes the list without a
  // navigation. The resource supersedes any in-flight request.
  private readonly challengesResource = this.challengeApi.challengesResource(() => ({
    status: this.statusFilter(),
    userId: this.userContext.userId(),
  }));

  readonly challenges: Signal<Challenge[]> = this.challengesResource.value;
  readonly loading: Signal<boolean> = this.challengesResource.isLoading;

  onFilterChange(status: ChallengeStatus | null): void {
    this.statusFilter.set(status);
  }
}
