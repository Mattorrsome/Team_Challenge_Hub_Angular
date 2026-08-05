import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';

// ASP.NET Core's ValidationProblemDetails shape, same as challenge-form parses.
interface ValidationProblemDetails {
  errors?: Record<string, string[]>;
}

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly serverErrors = signal<string[]>([]);

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverErrors.set([]);
    const { username, password } = this.form.getRawValue();

    this.auth.signUp(username, password).subscribe({
      next: () => this.router.navigate(['/challenges']),
      error: (err: HttpErrorResponse) => this.handleServerError(err),
    });
  }

  private handleServerError(err: HttpErrorResponse): void {
    if (err.status !== 400) {
      return; // 5xx already surfaced globally by errorHandlingInterceptor.
    }

    const body = err.error as ValidationProblemDetails;
    const usernameErrors = body?.errors?.['Username'] ?? [];
    if (usernameErrors.length > 0) {
      this.form.controls.username.setErrors({ server: usernameErrors[0] });
    }

    // Everything without its own inline field error, so a username conflict
    // isn't rendered twice (once by the field's mat-error, once here).
    const otherErrors = body?.errors
      ? Object.entries(body.errors)
          .filter(([field]) => field !== 'Username')
          .flatMap(([, messages]) => messages)
      : ['Please check the form and try again.'];
    this.serverErrors.set(otherErrors);
  }
}
