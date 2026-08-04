import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tch_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly current = signal<Theme>(this.readStoredTheme());

  readonly theme = this.current.asReadonly();

  constructor() {
    // The inline script in index.html already applied the stored theme before
    // first paint; re-applying here keeps the DOM correct when the service is
    // constructed in a context that script never ran in (unit tests, SSR).
    this.apply(this.current());
  }

  toggle(): void {
    const next: Theme = this.current() === 'dark' ? 'light' : 'dark';
    this.current.set(next);
    localStorage.setItem(STORAGE_KEY, next);
    this.apply(next);
  }

  private apply(theme: Theme): void {
    // Setting `color-scheme` is the whole switch: every Material system color
    // is emitted as light-dark(), which CSS resolves from this property.
    // Deliberately never 'light dark' — the app follows the user's explicit
    // choice, not the OS setting.
    document.documentElement.style.colorScheme = theme;
  }

  private readStoredTheme(): Theme {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  }
}
