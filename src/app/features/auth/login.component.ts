import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { GoogleSignInButtonComponent } from './google-signin.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDividerModule, GoogleSignInButtonComponent],
  template: `
    <main class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      <!-- Background glow effects -->
      <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div class="absolute top-[15%] left-[20%] w-[450px] h-[450px] rounded-full bg-indigo-600/15 blur-[140px]"></div>
        <div class="absolute bottom-[15%] right-[20%] w-[450px] h-[450px] rounded-full bg-emerald-600/10 blur-[150px]"></div>
      </div>

      <div class="w-full max-w-md space-y-6">
        <!-- Brand header -->
        <div class="text-center space-y-3">
          <div class="inline-flex p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-3xl shadow-xl shadow-indigo-500/10">
            ⚡
          </div>
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Marc Platform
            </h1>
            <p class="text-sm font-medium text-zinc-300 mt-1">
              Sign In with Google
            </p>
          </div>
          <p class="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Please sign in to access Marc Backend services, Fire Safety Solutions, Telegram controls, and tasks. Unregistered accounts are automatically provisioned.
          </p>
        </div>

        <!-- Auth Error Banner -->
        @if (authError() && !errorDismissed()) {
          <div class="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs space-y-1 animate-in fade-in duration-200">
            <div class="font-semibold flex items-center justify-between">
              <span class="flex items-center gap-1.5"><mat-icon class="!text-sm !w-4 !h-4 text-rose-400">warning</mat-icon> Authentication Failed</span>
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
        <mat-card class="!p-8 !rounded-2xl !bg-zinc-900/90 !border !border-zinc-800 !shadow-2xl backdrop-blur-xl">
          <div class="space-y-4">
            <app-google-signin-button
              label="Sign in with Google"
              size="lg"
              prompt="select_account"
              className="w-full justify-center shadow-lg hover:shadow-indigo-500/20"
            ></app-google-signin-button>

            @if (!authService.isConfigured()) {
              <div class="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-300/90 leading-relaxed">
                <span class="font-semibold block mb-0.5">⚠️ Setup Required:</span>
                Set <code class="font-mono text-amber-200">GOOGLE_CLIENT_ID</code> and
                <code class="font-mono text-amber-200">GOOGLE_CLIENT_SECRET</code> in
                <code class="font-mono text-amber-200">.env.local</code> to enable Google OAuth.
              </div>
            }
          </div>

          <mat-divider class="!my-6 !border-zinc-800/80"></mat-divider>

          <div class="space-y-2.5 text-xs text-zinc-400">
            <div class="flex items-center gap-2 text-zinc-300">
              <span class="text-emerald-400 font-bold">✓</span>
              <span>Single sign-on with verified Google Account</span>
            </div>
            <div class="flex items-center gap-2 text-zinc-300">
              <span class="text-emerald-400 font-bold">✓</span>
              <span>Automatic user account provisioning</span>
            </div>
            <div class="flex items-center gap-2 text-zinc-300">
              <span class="text-emerald-400 font-bold">✓</span>
              <span>Secure JWT session token management</span>
            </div>
          </div>
        </mat-card>

        <!-- Footer info -->
        <div class="text-center text-[11px] text-zinc-600">
          Protected by Google OAuth 2.0 & Next.js Session Security
        </div>
      </div>
    </main>
  `,
})
export class LoginComponent implements OnInit {
  readonly authService = inject(AuthService);
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
