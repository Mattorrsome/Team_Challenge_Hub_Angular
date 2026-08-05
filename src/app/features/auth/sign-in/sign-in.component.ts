import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  readonly serverError = signal<string | null>(null);

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.serverError.set(null);
    const { username, password } = this.form.getRawValue();

    this.auth.signIn(username, password).subscribe({
      next: () => this.router.navigate(['/challenges']),
      error: (err: HttpErrorResponse) => {
        // Only a 401 means bad credentials. 5xx is already surfaced globally by
        // errorHandlingInterceptor — claiming "invalid password" there would lie.
        if (err.status !== 401) {
          return;
        }
        // The API deliberately doesn't say whether the username exists, so the
        // message stays generic. Inline, not a snackbar — same as other forms.
        this.serverError.set('Invalid username or password.');
      },
    });
  }
}
