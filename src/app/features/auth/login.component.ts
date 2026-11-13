import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { GoogleSignInButtonComponent } from './google-signin.component';
import { LogoComponent } from '../../shared/components/logo.component';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    GoogleSignInButtonComponent,
    LogoComponent,
  ],
  template: `
    <main class="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white transition-colors">
      <!-- Top Right Theme Mode Selector -->
      <div class="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          type="button"
          [matMenuTriggerFor]="loginThemeMenu"
          class="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white shadow-xs transition-all cursor-pointer"
          [matTooltip]="'Theme: ' + themeService.currentLabel()"
          aria-label="Select theme mode"
        >
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px] !leading-none flex items-center justify-center">{{ themeService.currentIcon() }}</mat-icon>
        </button>

        <mat-menu #loginThemeMenu="matMenu" class="!bg-white dark:!bg-zinc-900 !border !border-zinc-200 dark:!border-zinc-800 !rounded-xl !p-1">
          <div class="px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800/80 mb-1">
            <p class="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Appearance</p>
          </div>
          @for (option of themeService.themeOptions; track option.value) {
            <button
              mat-menu-item
              (click)="themeService.setTheme(option.value)"
              class="!text-xs"
              [class.!font-semibold]="themeService.themeMode() === option.value"
              [class.!text-indigo-600]="themeService.themeMode() === option.value"
              [class.dark:!text-indigo-400]="themeService.themeMode() === option.value"
              [class.!text-zinc-700]="themeService.themeMode() !== option.value"
              [class.dark:!text-zinc-300]="themeService.themeMode() !== option.value"
            >
              <div class="flex items-center justify-between w-full">
                <div class="flex items-center gap-2">
                  <mat-icon class="!text-sm !w-4 !h-4">{{ option.icon }}</mat-icon>
                  <span>{{ option.label }}</span>
                </div>
                @if (themeService.themeMode() === option.value) {
                  <mat-icon class="!text-xs !w-3 !h-3 !ml-2 text-indigo-600 dark:text-indigo-400">check</mat-icon>
                }
              </div>
            </button>
          }
        </mat-menu>
      </div>

      <!-- Background glow effects -->
      <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div class="absolute top-[15%] left-[20%] w-[450px] h-[450px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/15 blur-[140px]"></div>
        <div class="absolute bottom-[15%] right-[20%] w-[450px] h-[450px] rounded-full bg-emerald-500/10 dark:bg-emerald-600/10 blur-[150px]"></div>
      </div>

      <div class="w-full max-w-md space-y-6">
        <!-- Brand header -->
        <div class="text-center space-y-3">
          <div class="inline-flex items-center justify-center">
            <app-logo size="xl" className="shadow-xl dark:shadow-2xl shadow-indigo-500/25"></app-logo>
          </div>
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Marc Platform
            </h1>
            <p class="text-sm font-medium text-zinc-600 dark:text-zinc-300 mt-1">
              Sign In with Google
            </p>
          </div>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Please sign in to access Marc Backend services, Fire Safety Solutions, Telegram controls, and tasks. Unregistered accounts are automatically provisioned.
          </p>
        </div>

        <!-- Auth Error Banner -->
        @if (authError() && !errorDismissed()) {
          <div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs space-y-1 animate-in fade-in duration-200">
            <div class="font-semibold flex items-center justify-between">
              <span class="flex items-center gap-1.5"><mat-icon class="!text-sm !w-4 !h-4 text-rose-500 dark:text-rose-400">warning</mat-icon> Authentication Failed</span>
              <button
                type="button"
                (click)="errorDismissed.set(true)"
                class="opacity-70 hover:opacity-100 p-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p class="opacity-90">{{ authErrorMessage() }}</p>
          </div>
        }

        <!-- Card -->
        <mat-card class="!p-8 !rounded-2xl !bg-white/90 dark:!bg-zinc-900/90 !border !border-zinc-200 dark:!border-zinc-800 !shadow-xl dark:!shadow-2xl backdrop-blur-xl">
          <div class="space-y-4">
            <app-google-signin-button
              label="Sign in with Google"
              size="lg"
              prompt="select_account"
              className="w-full justify-center shadow-md dark:shadow-lg hover:shadow-indigo-500/20"
            ></app-google-signin-button>

            @if (!authService.isConfigured()) {
              <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                <span class="font-semibold block mb-0.5">⚠️ Setup Required:</span>
                Set <code class="font-mono text-amber-900 dark:text-amber-200">GOOGLE_CLIENT_ID</code> and
                <code class="font-mono text-amber-900 dark:text-amber-200">GOOGLE_CLIENT_SECRET</code> in
                <code class="font-mono text-amber-900 dark:text-amber-200">.env.local</code> to enable Google OAuth.
              </div>
            }
          </div>

          <mat-divider class="!my-6 !border-zinc-200 dark:!border-zinc-800/80"></mat-divider>

          <div class="space-y-2.5 text-xs text-zinc-500 dark:text-zinc-400">
            <div class="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <span class="text-emerald-500 dark:text-emerald-400 font-bold">✓</span>
              <span>Single sign-on with verified Google Account</span>
            </div>
            <div class="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <span class="text-emerald-500 dark:text-emerald-400 font-bold">✓</span>
              <span>Automatic user account provisioning</span>
            </div>
            <div class="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <span class="text-emerald-500 dark:text-emerald-400 font-bold">✓</span>
              <span>Secure JWT session token management</span>
            </div>
          </div>
        </mat-card>

        <!-- Footer info -->
        <div class="text-center text-[11px] text-zinc-400 dark:text-zinc-600">
          Protected by Google OAuth 2.0 & Next.js Session Security
        </div>
      </div>
    </main>
  `,
})
export class LoginComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
  private route = inject(ActivatedRoute);

  readonly authError = signal<string | null>(null);
  readonly authErrorMessage = signal<string | null>(null);
  readonly errorDismissed = signal<boolean>(false);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const err = params['auth_error'];
      const errMsg = params['error_message'] || params['error_description'];
      if (err) {
        this.authError.set(err);
        this.authErrorMessage.set(
          errMsg ||
            (err === 'state_mismatch'
              ? 'Security state verification failed. Please try signing in again.'
              : err === 'missing_code'
              ? 'No authorization code returned from Google.'
              : `Google sign-in was not completed (${err}).`)
        );
      }
    });
  }
}
