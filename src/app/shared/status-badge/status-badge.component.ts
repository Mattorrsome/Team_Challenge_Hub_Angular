import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ChallengeStatus } from '../../core/models/challenge.model';

const LABELS: Record<ChallengeStatus, string> = {
  Submitted: 'Submitted',
  ProblemStatementDrafted: 'Problem Statement Drafted',
  OptionsDrafted: 'Options Drafted',
  OptionSelected: 'Option Selected',
  InReview: 'In Review',
  Approved: 'Approved',
  Rejected: 'Rejected',
};

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

  readonly label = computed(() => LABELS[this.statusSignal()]);
  readonly cssClass = computed(() => CSS_CLASSES[this.statusSignal()]);
}
