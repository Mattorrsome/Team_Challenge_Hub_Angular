import { UserRole } from '../auth/models/auth-user.model';

export interface User {
  id: number;
  name: string;
  username: string;
  role: UserRole;
}
