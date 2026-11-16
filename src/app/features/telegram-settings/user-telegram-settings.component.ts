import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { TelegramSettingsService } from '../../core/services/telegram-settings.service';
import { UserTelegramConfigStatus } from '../../core/models/telegram.models';

@Component({
  selector: 'app-user-telegram-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatRippleModule,
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <mat-icon class="!text-sky-500">send</mat-icon>
            <span>Personal Telegram Settings</span>
          </h1>
          <p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Configure your personal Telegram User/Chat ID for receiving AI responses, scheduled prompts, and Johan bot notifications.
          </p>
        </div>

        <!-- Connection Status Badge -->
        <div class="flex items-center gap-2">
          @if (loading()) {
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs">
              <mat-spinner diameter="14"></mat-spinner>
              <span>Loading...</span>
            </div>
          } @else if (config()?.isConfigured) {
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-xs font-medium">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Connected (ID: {{ config()?.telegramId }})</span>
            </div>
          } @else {
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-xs font-medium">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Not Configured</span>
            </div>
          }
        </div>
      </div>

      <!-- Messages -->
      @if (successMessage()) {
        <div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <span class="flex items-center gap-1.5"><mat-icon class="!text-sm !w-4 !h-4 text-emerald-600 dark:text-emerald-400">check_circle</mat-icon> {{ successMessage() }}</span>
          <button type="button" (click)="successMessage.set(null)" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-white cursor-pointer"><mat-icon class="!text-sm !w-4 !h-4">close</mat-icon></button>
        </div>
      }
      @if (errorMessage()) {
        <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between animate-in fade-in">
          <span class="flex items-center gap-1.5"><mat-icon class="!text-sm !w-4 !h-4 text-rose-600 dark:text-rose-400">error</mat-icon> {{ errorMessage() }}</span>
          <button type="button" (click)="errorMessage.set(null)" class="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-white cursor-pointer"><mat-icon class="!text-sm !w-4 !h-4">close</mat-icon></button>
        </div>
      }

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Configuration Card (Left 2 cols) -->
        <div class="lg:col-span-2 space-y-6">
          <mat-card class="!p-6 !rounded-2xl !bg-white dark:!bg-zinc-900/80 !border !border-zinc-200 dark:!border-zinc-800 !shadow-sm dark:!shadow-lg">
            <div class="flex items-center justify-between pb-4 mb-6 border-b border-zinc-100 dark:border-zinc-800">
              <div class="flex items-center gap-2">
                <mat-icon class="text-sky-500 !text-xl !w-5 !h-5">manage_accounts</mat-icon>
                <h2 class="text-sm font-semibold text-zinc-900 dark:text-white">Telegram ID Configuration</h2>
              </div>
              <span class="text-xs text-zinc-500 dark:text-zinc-400">Direct User Communication</span>
            </div>

            <form (ngSubmit)="saveSettings()" class="space-y-5">
              <!-- Telegram ID Input -->
              <div>
                <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  Telegram User ID / Chat ID <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <mat-icon class="!text-lg !w-5 !h-5">fingerprint</mat-icon>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="telegramId"
                    name="telegramId"
                    placeholder="e.g. 123456789"
                    required
                    class="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                  />
                </div>
                <p class="mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <mat-icon class="!text-sm !w-4 !h-4 text-sky-400">info</mat-icon>
                  Your numeric Telegram ID. Johan bot uses this unique ID to deliver responses directly to you.
                </p>
              </div>

              <!-- Telegram Username Input (Optional) -->
              <div>
                <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  Telegram Username (Optional)
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 font-mono text-sm">
                    @
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="telegramUsername"
                    name="telegramUsername"
                    placeholder="username"
                    class="w-full pl-9 pr-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              <!-- Notifications Toggle -->
              <div class="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <div class="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                      <mat-icon class="!text-lg !w-5 !h-5">notifications_active</mat-icon>
                    </div>
                    <div>
                      <p class="text-xs font-semibold text-zinc-900 dark:text-white">Enable Notifications</p>
                      <p class="text-[11px] text-zinc-500 dark:text-zinc-400">Receive automated and scheduled AI messages via Johan bot</p>
                    </div>
                  </div>
                  <mat-slide-toggle
                    [(ngModel)]="notificationsEnabled"
                    name="notificationsEnabled"
                    color="primary"
                  ></mat-slide-toggle>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800">
                <div class="flex items-center gap-2">
                  <button
                    mat-flat-button
                    color="primary"
                    type="submit"
                    [disabled]="saving()"
                    class="!rounded-xl !text-xs sm:!text-sm !font-semibold"
                  >
                    @if (saving()) {
                      <span class="flex items-center gap-1.5">
                        <mat-spinner diameter="14"></mat-spinner>
                        <span>Saving...</span>
                      </span>
                    } @else {
                      <span class="flex items-center">
                        <mat-icon class="!text-base !w-4 !h-4 !mr-1">save</mat-icon>
                        <span>Save Settings</span>
                      </span>
                    }
                  </button>

                  <button
                    mat-stroked-button
                    type="button"
                    (click)="testConnection()"
                    [disabled]="testing() || !telegramId"
                    class="!rounded-xl !text-xs sm:!text-sm"
                  >
                    @if (testing()) {
                      <span class="flex items-center gap-1.5">
                        <mat-spinner diameter="14"></mat-spinner>
                        <span>Sending Ping...</span>
                      </span>
                    } @else {
                      <span class="flex items-center">
                        <mat-icon class="!text-base !w-4 !h-4 !mr-1 text-sky-500 dark:text-sky-400">send</mat-icon>
                        <span>Send Test Message</span>
                      </span>
                    }
                  </button>
                </div>

                @if (config()?.isConfigured) {
                  <button
                    mat-stroked-button
                    color="warn"
                    type="button"
                    (click)="deleteSettings()"
                    [disabled]="deleting()"
                    class="!rounded-xl !text-xs sm:!text-sm"
                  >
                    @if (deleting()) {
                      <span class="flex items-center gap-1.5">
                        <mat-spinner diameter="14"></mat-spinner>
                        <span>Clearing...</span>
                      </span>
                    } @else {
                      <span class="flex items-center">
                        <mat-icon class="!text-base !w-4 !h-4 !mr-1">delete</mat-icon>
                        <span>Disconnect ID</span>
                      </span>
                    }
                  </button>
                }
              </div>
            </form>
          </mat-card>
        </div>

        <!-- Instructions & How-To (Right 1 col) -->
        <div class="space-y-6">
          <mat-card class="!p-6 !rounded-2xl !bg-white dark:!bg-zinc-900/80 !border !border-zinc-200 dark:!border-zinc-800 !shadow-sm dark:!shadow-lg">
            <div class="flex items-center gap-2 pb-4 mb-4 border-b border-zinc-100 dark:border-zinc-800">
              <mat-icon class="text-sky-500 !text-xl !w-5 !h-5">help_outline</mat-icon>
              <h3 class="text-sm font-semibold text-zinc-900 dark:text-white">How to get your Telegram ID</h3>
            </div>

            <ol class="space-y-4 text-xs text-zinc-600 dark:text-zinc-300">
              <li class="flex gap-3 items-start">
                <span class="w-5 h-5 rounded-full bg-sky-500/10 text-sky-500 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <div>
                  <p class="font-medium text-zinc-900 dark:text-white">Open Johan bot in Telegram</p>
                  <p class="text-zinc-500 dark:text-zinc-400 mt-0.5">Search for <code>&#64;{{ config()?.botUsername || 'johan_bot' }}</code> or start a conversation with the bot.</p>
                </div>
              </li>
              <li class="flex gap-3 items-start">
                <span class="w-5 h-5 rounded-full bg-sky-500/10 text-sky-500 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <div>
                  <p class="font-medium text-zinc-900 dark:text-white">Start the conversation</p>
                  <p class="text-zinc-500 dark:text-zinc-400 mt-0.5">Click <strong>Start</strong> or send <code>/start</code> in the Telegram chat.</p>
                </div>
              </li>
              <li class="flex gap-3 items-start">
                <span class="w-5 h-5 rounded-full bg-sky-500/10 text-sky-500 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <div>
                  <p class="font-medium text-zinc-900 dark:text-white">Find your User ID</p>
                  <p class="text-zinc-500 dark:text-zinc-400 mt-0.5">You can check your ID via <code>&#64;userinfobot</code> or Johan bot info.</p>
                </div>
              </li>
              <li class="flex gap-3 items-start">
                <span class="w-5 h-5 rounded-full bg-sky-500/10 text-sky-500 font-bold flex items-center justify-center shrink-0 text-[11px]">4</span>
                <div>
                  <p class="font-medium text-zinc-900 dark:text-white">Save and test</p>
                  <p class="text-zinc-500 dark:text-zinc-400 mt-0.5">Paste your ID into the form on the left, save, and click <strong>Send Test Message</strong>.</p>
                </div>
              </li>
            </ol>
          </mat-card>

          <!-- Integration Capabilities Card -->
          <mat-card class="!bg-gradient-to-br !from-sky-500/5 !to-indigo-500/5 !border !border-sky-500/20 !rounded-2xl !p-5 shadow-sm">
            <h4 class="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <mat-icon class="!text-sm !w-4 !h-4">smart_toy</mat-icon>
              Connected Features
            </h4>
            <ul class="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li class="flex items-center gap-2">
                <mat-icon class="!text-sm !w-4 !h-4 text-emerald-400">check</mat-icon>
                <span>Automated scheduled prompt deliveries</span>
              </li>
              <li class="flex items-center gap-2">
                <mat-icon class="!text-sm !w-4 !h-4 text-emerald-400">check</mat-icon>
                <span>Direct AI task calculations over Johan bot</span>
              </li>
              <li class="flex items-center gap-2">
                <mat-icon class="!text-sm !w-4 !h-4 text-emerald-400">check</mat-icon>
                <span>Personalized notifications & system alerts</span>
              </li>
            </ul>
          </mat-card>
        </div>
      </div>
    </div>
  `,
})
export class UserTelegramSettingsComponent implements OnInit {
  private telegramService = inject(TelegramSettingsService);

  readonly config = signal<UserTelegramConfigStatus | null>(null);
  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly testing = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);

  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  telegramId = '';
  telegramUsername = '';
  notificationsEnabled = true;

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading.set(true);
    this.telegramService.getSettings().subscribe({
      next: (res) => {
        this.config.set(res.config);
        this.telegramId = res.config.telegramId || '';
        this.telegramUsername = res.config.telegramUsername || '';
        this.notificationsEnabled = res.config.notificationsEnabled;
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Failed to load Telegram configuration.');
        this.loading.set(false);
      },
    });
  }

  saveSettings(): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.telegramService
      .saveSettings({
        telegramId: this.telegramId,
        telegramUsername: this.telegramUsername,
        notificationsEnabled: this.notificationsEnabled,
      })
      .subscribe({
        next: (res) => {
          this.config.set(res.config);
          this.successMessage.set(res.message || 'Telegram settings saved successfully.');
          this.saving.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.error || 'Failed to save Telegram settings.');
          this.saving.set(false);
        },
      });
  }

  testConnection(): void {
    this.testing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.telegramService
      .testNotification({
        telegramId: this.telegramId,
        telegramUsername: this.telegramUsername,
      })
      .subscribe({
        next: (res) => {
          this.successMessage.set('Test message successfully sent to your Telegram via Johan bot!');
          this.testing.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.error || 'Failed to send test message via Johan bot.');
          this.testing.set(false);
        },
      });
  }

  deleteSettings(): void {
    if (!confirm('Are you sure you want to disconnect and clear your personal Telegram configuration?')) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.telegramService.deleteSettings().subscribe({
      next: (res) => {
        this.config.set(res.config);
        this.telegramId = '';
        this.telegramUsername = '';
        this.notificationsEnabled = true;
        this.successMessage.set('Telegram settings cleared successfully.');
        this.deleting.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Failed to delete Telegram settings.');
        this.deleting.set(false);
      },
    });
  }
}
