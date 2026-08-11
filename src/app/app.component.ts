import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterLink,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly showBack = computed(() => {
    const path = this.url().split('?')[0];
    // '' and '/' are the pre-redirect root: router.url reads '/' on first
    // paint, before the '' -> 'challenges' redirect fires a NavigationEnd.
    // Treating them as the list keeps the bar from flashing on load.
    if (path === '' || path === '/' || path === '/challenges') return false;
    return !path.startsWith('/sign-');
  });

  onSignOut(): void {
    this.auth.signOut().subscribe({
      next: () => this.router.navigate(['/sign-in']),
      // A failed sign-out leaves the server session live, so staying put is the
      // honest outcome — navigating to /sign-in would claim we signed out when
      // we didn't. errorHandlingInterceptor already snackbars the 5xx.
      error: () => {},
    });
  }
}
