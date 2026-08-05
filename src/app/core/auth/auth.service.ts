import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser } from './models/auth-user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private readonly user = signal<AuthUser | null>(null);

  readonly currentUser = this.user.asReadonly();
  readonly isAdmin = computed(() => this.user()?.role === 'Admin');

  /**
   * Resolves the session cookie to a user on app start. A 401 (no cookie, or
   * an expired one) is a normal outcome, not an error — it maps to null so the
   * app initializer never rejects and the guards simply redirect.
   */
  loadCurrentUser(): Observable<AuthUser | null> {
    return this.http.get<AuthUser>(`${this.baseUrl}/me`).pipe(
      catchError(() => of(null)),
      tap((user) => this.user.set(user)),
    );
  }

  signIn(username: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${this.baseUrl}/signin`, { username, password })
      .pipe(tap((user) => this.user.set(user)));
  }

  /** The API signs the new account in as part of signup, so the response body is the session user. */
  signUp(username: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthUser>(`${this.baseUrl}/signup`, { username, password })
      .pipe(tap((user) => this.user.set(user)));
  }

  signOut(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/signout`, {})
      .pipe(tap(() => this.user.set(null)));
  }

  /**
   * Drops the cached identity without calling the API — for when the server has
   * already invalidated the session (a 401 on any authenticated request), so the
   * guards and header stop trusting state the server has thrown away.
   */
  clearCurrentUser(): void {
    this.user.set(null);
  }
}
