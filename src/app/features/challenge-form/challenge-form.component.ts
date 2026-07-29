import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ChallengeApiService } from '../../core/services/challenge-api.service';
import { Challenge, CreateChallengeRequest } from '../../core/models/challenge.model';

type FormMode = 'create' | 'edit';

// ASP.NET Core's default validation failure body shape
// (ValidationProblemDetails) — assumption, adjust once the real API responds.
interface ValidationProblemDetails {
  errors?: Record<string, string[]>;
}

@Component({
  selector: 'app-challenge-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './challenge-form.component.html',
  styleUrl: './challenge-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChallengeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly challengeApi = inject(ChallengeApiService);

  @Output() formSubmit = new EventEmitter<CreateChallengeRequest>();

  readonly mode = signal<FormMode>('create');
  private editingChallenge: Challenge | null = null;

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    rawNotes: ['', Validators.required],
  });

  readonly serverErrors = signal<string[]>([]);

  ngOnInit(): void {
    const mode = (this.route.snapshot.data['mode'] as FormMode) ?? 'create';
    this.mode.set(mode);

    if (mode === 'edit') {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.form.controls.rawNotes.disable();
      this.challengeApi.getChallenge(id).subscribe((challenge) => {
        this.editingChallenge = challenge;
        this.form.patchValue({ title: challenge.title, rawNotes: challenge.rawNotes });
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverErrors.set([]);
    const { title, rawNotes } = this.form.getRawValue();

    if (this.mode() === 'edit' && this.editingChallenge) {
      this.challengeApi
        .updateChallenge(this.editingChallenge.id, {
          title,
          problemStatement: this.editingChallenge.problemStatement,
        })
        .subscribe({
          next: (challenge) => this.router.navigate(['/challenges', challenge.id]),
          error: (err: HttpErrorResponse) => this.handleServerError(err),
        });
      return;
    }

    const payload: CreateChallengeRequest = { title, rawNotes };
    this.formSubmit.emit(payload);
    this.challengeApi.createChallenge(payload).subscribe({
      next: (challenge) => this.router.navigate(['/challenges', challenge.id]),
      error: (err: HttpErrorResponse) => this.handleServerError(err),
    });
  }

  private handleServerError(err: HttpErrorResponse): void {
    if (err.status !== 400) {
      return; // 409/5xx already surfaced globally by errorHandlingInterceptor.
    }
    const body = err.error as ValidationProblemDetails;
    const messages = body?.errors ? Object.values(body.errors).flat() : ['Please check the form and try again.'];
    this.serverErrors.set(messages);
  }
}
