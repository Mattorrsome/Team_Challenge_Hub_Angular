import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ChallengeApiService } from '../../../core/services/challenge-api.service';
import { Challenge } from '../../../core/models/challenge.model';

@Component({
  selector: 'app-problem-statement-panel',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './problem-statement-panel.component.html',
  styleUrl: './problem-statement-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProblemStatementPanelComponent {
  private readonly challengeApi = inject(ChallengeApiService);

  private readonly challengeSignal = signal<Challenge | null>(null);
  // Once the user starts typing in the textarea, stop re-seeding draftText from
  // incoming challenge updates (e.g. a sibling panel's action refreshing the
  // challenge) — otherwise an in-progress unsaved edit is silently discarded.
  private hasUserEdited = false;

  @Input({ required: true })
  set challenge(value: Challenge) {
    this.challengeSignal.set(value);
    if (!this.hasUserEdited) {
      this.draftText.set(value.problemStatement ?? '');
    }
  }
  get challenge(): Challenge {
    return this.challengeSignal()!;
  }

  @Output() challengeUpdated = new EventEmitter<Challenge>();

  readonly draftText = signal('');
  readonly isDrafting = signal(false);
  /** Server message from a failed draft request, shown inline. */
  readonly draftError = signal<string | null>(null);

  updateDraftText(text: string): void {
    this.hasUserEdited = true;
    this.draftText.set(text);
  }

  requestDraft(): void {
    this.isDrafting.set(true);
    this.draftError.set(null);
    this.challengeApi.draftProblemStatement(this.challenge.id).subscribe({
      next: (response) => {
        this.draftText.set(response.problemStatement);
        this.isDrafting.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isDrafting.set(false);
        // The API sends { error: "..." } on a 503. The fallback covers a
        // network or proxy failure, where there is no body to read, and a
        // non-string body (error.error is `any`, so it isn't guaranteed).
        const message = typeof error.error?.error === 'string' ? error.error.error : null;
        this.draftError.set(message ?? 'AI drafting is unavailable. Please try again.');
      },
    });
  }

  acceptAndSave(): void {
    this.challengeApi
      .updateChallenge(this.challenge.id, {
        title: this.challenge.title,
        problemStatement: this.draftText(),
      })
      .subscribe((updated) => this.challengeUpdated.emit(updated));
  }
}
