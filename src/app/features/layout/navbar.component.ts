import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LogoComponent } from '../../shared/components/logo.component';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, LogoComponent],
  template: `
    <header class="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-sm dark:shadow-md transition-colors">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Left: Mobile Menu Toggle & Brand -->
          <div class="flex items-center gap-3 sm:gap-4">
            @if (showSidebarToggle && showSidebar && showMenu && showToggle) {
              <button
                mat-icon-button
                type="button"
                (click)="toggleSidebar.emit()"
                class="lg:!hidden text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                matTooltip="Toggle Navigation Menu"
              >
                <mat-icon>menu</mat-icon>
              </button>
            }

            <a
              routerLink="/"
              class="flex items-center gap-3 group transition-transform active:scale-95"
            >
              <app-logo size="md" className="group-hover:shadow-indigo-500/40 transition-shadow"></app-logo>
              <div class="flex flex-col">
                <span class="font-bold text-sm tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
                  Marc Platform
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Live
                  </span>
                </span>
                <span class="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">Fire Safety &amp; AI System</span>
              </div>
            </a>
          </div>

          <!-- Right: User info, Theme Switcher & Actions -->
          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Theme Selection Trigger -->
            <button
              type="button"
              [matMenuTriggerFor]="themeMenu"
              class="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer shadow-xs"
              [matTooltip]="'Theme: ' + themeService.currentLabel()"
              aria-label="Select theme mode (Light, Dark, System)"
            >
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px] !leading-none flex items-center justify-center">{{ themeService.currentIcon() }}</mat-icon>
            </button>

            <mat-menu #themeMenu="matMenu" class="!bg-white dark:!bg-zinc-900 !border !border-zinc-200 dark:!border-zinc-800 !rounded-xl !p-1">
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

            @if (authService.currentUser(); as user) {
              <!-- Role Badge -->
              @if (authService.roleInfo(); as roleInfo) {
                <span
                  class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                  [ngClass]="[roleInfo.badgeColor.bg, roleInfo.badgeColor.text, roleInfo.badgeColor.border]"
                >
                  <span class="w-1.5 h-1.5 rounded-full" [ngClass]="roleInfo.badgeColor.dot"></span>
                  {{ roleInfo.name }}
                </span>
              }

              <!-- User Menu Trigger -->
              <button
                type="button"
                [matMenuTriggerFor]="userMenu"
                class="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer"
              >
                @if (user.picture) {
                  <img
                    [src]="user.picture"
                    [alt]="user.name"
                    class="w-7 h-7 rounded-lg object-cover"
                  />
                } @else {
                  <div class="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                    {{ user.name.charAt(0) }}
                  </div>
                }
                <span class="hidden md:inline-block text-xs font-medium text-zinc-800 dark:text-zinc-200 pr-1 max-w-[120px] truncate">
                  {{ user.name }}
                </span>
                <mat-icon class="!text-zinc-500 dark:!text-zinc-400 !text-base !w-4 !h-4">expand_more</mat-icon>
              </button>

              <mat-menu #userMenu="matMenu" class="!bg-white dark:!bg-zinc-900 !border !border-zinc-200 dark:!border-zinc-800 !rounded-xl !p-1">
                <div class="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800/80 mb-1">
                  <p class="text-xs font-semibold text-zinc-900 dark:text-white truncate">{{ user.name }}</p>
                  <p class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{{ user.email }}</p>
                </div>

                <a mat-menu-item routerLink="/ai-settings" class="!text-xs !text-zinc-700 dark:!text-zinc-300 hover:!text-zinc-900 dark:hover:!text-white">
                  <mat-icon class="!text-amber-500 dark:!text-amber-400 !text-sm !w-4 !h-4 !mr-2">bolt</mat-icon>
                  <span>Personal AI Settings</span>
                </a>

                <a mat-menu-item routerLink="/system" class="!text-xs !text-zinc-700 dark:!text-zinc-300 hover:!text-zinc-900 dark:hover:!text-white">
                  <mat-icon class="!text-indigo-600 dark:!text-indigo-400 !text-sm !w-4 !h-4 !mr-2">settings</mat-icon>
                  <span>System Administration</span>
                </a>

                <div class="border-t border-zinc-200 dark:border-zinc-800/80 my-1"></div>

                <button mat-menu-item (click)="logout()" class="!text-xs !text-rose-600 dark:!text-rose-400 hover:!text-rose-700 dark:hover:!text-rose-300">
                  <mat-icon class="!text-rose-600 dark:!text-rose-400 !text-sm !w-4 !h-4 !mr-2">logout</mat-icon>
                  <span>Log Out</span>
                </button>
              </mat-menu>
            } @else {
              <a
                mat-flat-button
                color="primary"
                routerLink="/login"
                class="!rounded-xl !text-xs !font-medium"
              >
                Sign In
              </a>
            }
          </div>
        </div>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);

  @Input() showSidebarToggle = true;
  @Input() showSidebar = true;
  @Input() showMenu = true;
  @Input() showToggle = true;

  @Output() toggleSidebar = new EventEmitter<void>();

  logout(): void {
    this.authService.logout().subscribe();
  }
}
