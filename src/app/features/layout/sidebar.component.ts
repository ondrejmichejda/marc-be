import { Component, inject, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LogoComponent } from '../../shared/components/logo.component';
import { AuthService } from '../../core/services/auth.service';
import { MenuItem, MenuCategory } from '../../core/models/auth.models';

interface NavRouteMapping {
  id: string;
  route: string;
  label: string;
  icon: string;
  badge?: string;
  description: string;
  category: MenuCategory;
}

const DEFAULT_NAV_ITEMS: NavRouteMapping[] = [
  {
    id: 'fire_safety_solutions',
    route: '/fss',
    label: 'Fire Safety Solutions',
    icon: 'local_fire_department',
    badge: 'FSS',
    description: 'Manage Fire Safety Solutions and building documentation',
    category: 'General',
  },
  {
    id: 'fss_ai_prompts',
    route: '/fss-prompts',
    label: 'FSS AI Prompts',
    icon: 'edit_note',
    badge: 'PBŘ Prompts',
    description: 'AI prompt šablony a správa DOCX šablony (template.docx) pro PBŘ',
    category: 'Administration',
  },
  {
    id: 'openai_settings',
    route: '/ai-settings',
    label: 'AI Settings',
    icon: 'tune',
    badge: 'Personal',
    description: 'Configure personal OpenAI API key and default model',
    category: 'Administration',
  },
  {
    id: 'ai_prompts',
    route: '/prompts',
    label: 'Scheduled Prompts',
    icon: 'schedule',
    badge: 'Cron',
    description: 'Scheduled automated AI prompts with Telegram delivery',
    category: 'Operations',
  },
  {
    id: 'system_administration',
    route: '/system',
    label: 'System Admin',
    icon: 'admin_panel_settings',
    badge: 'Admin',
    description: 'Role definitions, Telegram Bot, OpenAI analytics, and users',
    category: 'System',
  },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatRippleModule, MatIconModule, MatTooltipModule, LogoComponent],
  template: `
    <!-- Mobile Backdrop -->
    @if (mobileOpen) {
      <div
        class="fixed inset-0 z-40 bg-zinc-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        (click)="closeSidebar.emit()"
      ></div>
    }

    <!-- Sidebar Container -->
    <aside
      class="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-800/80 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-full flex flex-col shrink-0"
      [class.translate-x-0]="mobileOpen"
      [class.-translate-x-full]="!mobileOpen"
    >
      <!-- Top Brand inside mobile sidebar -->
      <div class="h-16 flex items-center justify-between px-6 border-b border-zinc-200/80 dark:border-zinc-800/80 lg:hidden shrink-0">
        <div class="flex items-center gap-2.5">
          <app-logo size="sm"></app-logo>
          <span class="font-bold text-sm tracking-tight text-zinc-900 dark:text-white">Marc Platform</span>
        </div>
        <button
          type="button"
          (click)="closeSidebar.emit()"
          class="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer"
        >
          <mat-icon class="!text-zinc-500 dark:!text-zinc-400 !text-lg !w-5 !h-5">close</mat-icon>
        </button>
      </div>

      <!-- Navigation Categories -->
      <div class="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-6">
        @for (category of categories(); track category) {
          @if (getItemsForCategory(category).length > 0) {
            <div class="space-y-1.5">
              <h3 class="px-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {{ category }}
              </h3>
              <div class="space-y-1">
                @for (item of getItemsForCategory(category); track item.id) {
                  <a
                    matRipple
                    [routerLink]="item.route"
                    routerLinkActive="bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 font-semibold"
                    [routerLinkActiveOptions]="{ exact: false }"
                    (click)="closeSidebar.emit()"
                    [matTooltip]="item.description"
                    matTooltipPosition="right"
                    class="group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white border border-transparent transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <mat-icon class="!text-lg !w-5 !h-5 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors flex-shrink-0">
                        {{ item.icon }}
                      </mat-icon>
                      <span class="truncate">{{ item.label }}</span>
                    </div>

                    @if (item.badge) {
                      <span class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                        {{ item.badge }}
                      </span>
                    }
                  </a>
                }
              </div>
            </div>
          }
        }
      </div>

      <!-- Bottom User Card -->
      @if (authService.currentUser(); as user) {
        <div class="p-4 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 shrink-0">
          <div class="flex items-center gap-3">
            @if (user.picture) {
              <img
                [src]="user.picture"
                [alt]="user.name"
                class="w-8 h-8 rounded-lg object-cover"
              />
            } @else {
              <div class="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                {{ user.name.charAt(0) }}
              </div>
            }
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-zinc-900 dark:text-white truncate">{{ user.name }}</p>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{{ user.email }}</p>
            </div>
          </div>
        </div>
      }
    </aside>
  `,
})
export class SidebarComponent {
  readonly authService = inject(AuthService);

  @Input() mobileOpen = false;
  @Output() closeSidebar = new EventEmitter<void>();

  readonly categories = computed<MenuCategory[]>(() => ['General', 'Operations', 'Administration', 'System']);

  getItemsForCategory(category: MenuCategory): NavRouteMapping[] {
    const allowedMenu = this.authService.menuItems();
    const isAdmin = this.authService.isAdmin();
    const isOperator = this.authService.isOperator();

    return DEFAULT_NAV_ITEMS.filter((item) => {
      if (item.category !== category) return false;
      if (allowedMenu.length > 0) {
        const menuItem = allowedMenu.find((m) => m.id === item.id);
        if (menuItem) return true;
      }
      // Built-in fallback
      if (item.id === 'system_administration' || item.id === 'fss_ai_prompts') {
        return isAdmin;
      }
      if (item.id === 'ai_prompts') {
        return isOperator;
      }
      return true;
    });
  }
}
