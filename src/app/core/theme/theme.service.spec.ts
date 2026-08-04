import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.colorScheme = '';
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.style.colorScheme = '';
  });

  it('defaults to light when nothing is stored', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('restores the persisted theme on construction', () => {
    localStorage.setItem('tch_theme', 'dark');

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('toggle flips the theme, the DOM, and storage', () => {
    const service = TestBed.inject(ThemeService);

    service.toggle();

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem('tch_theme')).toBe('dark');

    service.toggle();

    expect(service.theme()).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(localStorage.getItem('tch_theme')).toBe('light');
  });

  it('ignores a garbage stored value and falls back to light', () => {
    localStorage.setItem('tch_theme', 'chartreuse');

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('never emits the OS-deferring "light dark" value', () => {
    const service = TestBed.inject(ThemeService);
    service.toggle();

    expect(document.documentElement.style.colorScheme).not.toContain(' ');
  });
});
