import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChallengeApiService } from '../../core/services/challenge-api.service';
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
export class ChallengeListComponent implements OnInit {
  private readonly challengeApi = inject(ChallengeApiService);

  readonly statuses = ALL_STATUSES;
  readonly challenges = signal<Challenge[]>([]);
  readonly loading = signal(true);
  readonly statusFilter = signal<ChallengeStatus | null>(null);

  ngOnInit(): void {
    this.load();
  }

  onFilterChange(status: ChallengeStatus | null): void {
    this.statusFilter.set(status);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.challengeApi.getChallenges(this.statusFilter() ?? undefined).subscribe((challenges) => {
      this.challenges.set(challenges);
      this.loading.set(false);
    });
  }
}
