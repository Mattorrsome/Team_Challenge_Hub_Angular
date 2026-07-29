import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'tch_current_user_id';

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private readonly currentUserId = signal<number | null>(this.readStoredUserId());

  readonly userId = this.currentUserId.asReadonly();

  setUser(id: number): void {
    localStorage.setItem(STORAGE_KEY, String(id));
    this.currentUserId.set(id);
  }

  clearUser(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.currentUserId.set(null);
  }

  private readStoredUserId(): number | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  }
}
