import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ChallengeApiService } from '../../../core/services/challenge-api.service';
import { Challenge } from '../../../core/models/challenge.model';

@Component({
  selector: 'app-solution-options-panel',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './solution-options-panel.component.html',
  styleUrl: './solution-options-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolutionOptionsPanelComponent {
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

  readonly draftOptions = signal<string[]>([]);
  readonly isDrafting = signal(false);

  requestDrafts(): void {
    this.isDrafting.set(true);
    this.challengeApi.draftSolutionOptions(this.challenge.id).subscribe({
      next: (response) => {
        this.draftOptions.set(response.options);
        this.isDrafting.set(false);
      },
      error: () => {
        this.isDrafting.set(false);
      },
    });
  }

  updateDraft(index: number, text: string): void {
    const next = [...this.draftOptions()];
    next[index] = text;
    this.draftOptions.set(next);
  }

  acceptDraft(index: number): void {
    const text = this.draftOptions()[index];
    const challengeId = this.challenge.id;
    this.challengeApi.addOption(challengeId, text).subscribe(() => {
      const remaining = this.draftOptions().filter((_, i) => i !== index);
      this.draftOptions.set(remaining);
      // Re-fetch rather than guessing the new status client-side — addOption only
      // returns the created SolutionOption, and the API is the source of truth
      // for status transitions (see finding #2).
      this.challengeApi.getChallenge(challengeId).subscribe((updated) => {
        this.challengeUpdated.emit(updated);
      });
    });
  }

  selectOption(optionId: number): void {
    this.challengeApi.selectOption(this.challenge.id, optionId).subscribe((updated) => {
      this.challengeUpdated.emit(updated);
    });
  }
}
