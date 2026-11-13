import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeOption {
  value: ThemeMode;
  label: string;
  icon: string;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly THEME_STORAGE_KEY = 'marc_theme';

  readonly themeOptions: ThemeOption[] = [
    {
      value: 'light',
      label: 'Light',
      icon: 'light_mode',
      description: 'Světlý motiv s vysokou čitelností a jasem',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: 'dark_mode',
      description: 'Tmavý motiv šetřící zrak i spotřebu energie',
    },
    {
      value: 'system',
      label: 'System',
      icon: 'desktop_windows',
      description: 'Automatické přizpůsobení podle operačního systému',
    },
  ];

  // User preference: 'light' | 'dark' | 'system'
  readonly themeMode = signal<ThemeMode>(this.getInitialThemeMode());

  // OS preference
  readonly systemIsDark = signal<boolean>(this.checkSystemDark());

  // Resolved active visual theme: 'light' | 'dark'
  readonly activeTheme = computed<'light' | 'dark'>(() => {
    const mode = this.themeMode();
    if (mode === 'system') {
      return this.systemIsDark() ? 'dark' : 'light';
    }
    return mode;
  });

  readonly isDark = computed<boolean>(() => this.activeTheme() === 'dark');
  readonly isLight = computed<boolean>(() => this.activeTheme() === 'light');
  readonly isSystem = computed<boolean>(() => this.themeMode() === 'system');

  readonly currentIcon = computed<string>(() => {
    const mode = this.themeMode();
    if (mode === 'system') return 'desktop_windows';
    return mode === 'dark' ? 'dark_mode' : 'light_mode';
  });

  readonly currentLabel = computed<string>(() => {
    const mode = this.themeMode();
    if (mode === 'system') return 'System';
    return mode === 'dark' ? 'Dark' : 'Light';
  });

  constructor() {
    this.listenToSystemChanges();

    // Apply to DOM whenever activeTheme changes
    effect(() => {
      const active = this.activeTheme();
      this.applyThemeToDOM(active);
    });
  }

  setTheme(mode: ThemeMode): void {
    this.themeMode.set(mode);
    try {
      localStorage.setItem(this.THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore in restricted environments
    }
  }

  cycleTheme(): void {
    const current = this.themeMode();
    if (current === 'light') {
      this.setTheme('dark');
    } else if (current === 'dark') {
      this.setTheme('system');
    } else {
      this.setTheme('light');
    }
  }

  private getInitialThemeMode(): ThemeMode {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.THEME_STORAGE_KEY) as ThemeMode | null;
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          return saved;
        }
      } catch {
        // Fallback
      }
    }
    return 'system';
  }

  private checkSystemDark(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  }

  private listenToSystemChanges(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        this.systemIsDark.set(e.matches);
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
      } else if ('addListener' in mediaQuery && typeof (mediaQuery as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener === 'function') {
        (mediaQuery as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(listener);
      }
    }
  }

  private applyThemeToDOM(theme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
      if (body) {
        body.classList.add('dark');
        body.classList.remove('light');
      }
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
      if (body) {
        body.classList.remove('dark');
        body.classList.add('light');
      }
    }
  }
}
