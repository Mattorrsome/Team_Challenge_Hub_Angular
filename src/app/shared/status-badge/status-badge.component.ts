import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ChallengeStatus, STATUS_LABELS } from '../../core/models/challenge.model';

const CSS_CLASSES: Record<ChallengeStatus, string> = {
  Submitted: 'status-badge--neutral',
  ProblemStatementDrafted: 'status-badge--info',
  OptionsDrafted: 'status-badge--info',
  OptionSelected: 'status-badge--warning',
  InReview: 'status-badge--warning',
  Approved: 'status-badge--success',
  Rejected: 'status-badge--danger',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [NgClass],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  private readonly statusSignal = signal<ChallengeStatus>('Submitted');

  @Input({ required: true })
  set status(value: ChallengeStatus) {
    this.statusSignal.set(value);
  }

  readonly label = computed(() => STATUS_LABELS[this.statusSignal()]);
  readonly cssClass = computed(() => CSS_CLASSES[this.statusSignal()]);
}
