import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { UserApiService } from '../../core/services/user-api.service';
import { UserContextService } from '../../core/user-context/user-context.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-user-picker',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './user-picker.component.html',
  styleUrl: './user-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPickerComponent implements OnInit {
  private readonly userApi = inject(UserApiService);
  readonly userContext = inject(UserContextService);

  readonly users = signal<User[]>([]);

  ngOnInit(): void {
    this.userApi.getUsers().subscribe((users) => this.users.set(users));
  }

  selectUser(id: number): void {
    this.userContext.setUser(id);
  }
}
