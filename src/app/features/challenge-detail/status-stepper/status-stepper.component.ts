import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ChallengeApiService } from '../../../core/services/challenge-api.service';
import { Challenge, ChallengeStatus } from '../../../core/models/challenge.model';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';

const STEP_ORDER: ChallengeStatus[] = [
  'Submitted',
  'ProblemStatementDrafted',
  'OptionsDrafted',
  'OptionSelected',
  'InReview',
  'Approved',
];

@Component({
  selector: 'app-status-stepper',
  standalone: true,
  imports: [MatButtonModule, StatusBadgeComponent],
  templateUrl: './status-stepper.component.html',
  styleUrl: './status-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusStepperComponent {
  private readonly challengeApi = inject(ChallengeApiService);

  private readonly challengeSignal = signal<Challenge | null>(null);

  @Input({ required: true })
  set challenge(value: Challenge) {
    this.challengeSignal.set(value);
  }
  get challenge(): Challenge {
    return this.challengeSignal()!;
  }

  @Output() challengeUpdated = new EventEmitter<Challenge>();

  readonly steps = STEP_ORDER;

  transition(status: ChallengeStatus): void {
    this.challengeApi.updateStatus(this.challenge.id, status).subscribe((updated) => {
      this.challengeUpdated.emit(updated);
    });
  }
}
