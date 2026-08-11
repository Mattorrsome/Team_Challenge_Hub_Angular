import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserApiService } from '../../../core/services/user-api.service';
import { User } from '../../../core/models/user.model';
import { UserRole } from '../../../core/auth/models/auth-user.model';

const ROLES: UserRole[] = ['Collaborator', 'Admin'];

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagementComponent {
  private readonly userApi = inject(UserApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly roles = ROLES;
  readonly users = signal<User[]>([]);

  constructor() {
    this.reload();
  }

  onRoleChange(user: User, role: UserRole): void {
    if (role === user.role) return;
    this.userApi.updateRole(user.id, role).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) =>
        this.notifyFailure(err, `Could not change ${user.username}'s role.`),
    });
  }

  onDelete(user: User): void {
    // The control is an unlabelled icon next to a role dropdown, and the API
    // deletes immediately — this is the only thing between a mis-click and a
    // removed user.
    if (!confirm(`Delete ${user.username}?`)) return;

    this.userApi.deleteUser(user.id).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => {
        // The API blocks deleting an owner rather than cascading. The global
        // interceptor skips 409s on /users/ so this message wins.
        const message =
          err.status === 409
            ? `${user.username} still owns challenges — remove those first.`
            : `Could not delete ${user.username}.`;
        this.notifyFailure(err, message);
      },
    });
  }

  private reload(): void {
    this.userApi.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: (err: HttpErrorResponse) => this.notifyFailure(err, 'Could not load users.'),
    });
  }

  /**
   * Surfaces failures the global interceptor deliberately leaves alone: it
   * redirects on 401 and snackbars 5xx, and skips 409 entirely for /users/
   * URLs so this view can speak for itself.
   */
  private notifyFailure(err: HttpErrorResponse, message: string): void {
    if (err.status === 401 || err.status >= 500) {
      return;
    }
    this.snackBar.open(message, 'Dismiss', { duration: 5000 });
  }
}
