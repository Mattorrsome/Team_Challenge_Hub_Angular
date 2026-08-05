export type UserRole = 'Collaborator' | 'Admin';

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
}
