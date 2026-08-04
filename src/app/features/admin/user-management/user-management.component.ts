import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserApiService } from '../../../core/services/user-api.service';
import { User } from '../../../core/models/user.model';
import { UserRole } from '../../../core/auth/models/auth-user.model';

const ROLES: UserRole[] = ['Collaborator', 'Admin'];

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatSelectModule],
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
    this.userApi.updateRole(user.id, role).subscribe(() => this.reload());
  }

  onDelete(user: User): void {
    this.userApi.deleteUser(user.id).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => {
        // The API blocks deleting an owner rather than cascading. The global
        // interceptor skips 409s on /users/ so this message wins.
        if (err.status === 409) {
          this.snackBar.open(
            `${user.username} still owns challenges — remove those first.`,
            'Dismiss',
            { duration: 5000 },
          );
        }
      },
    });
  }

  private reload(): void {
    this.userApi.getUsers().subscribe((users) => this.users.set(users));
  }
}
