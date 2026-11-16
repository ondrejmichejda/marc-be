import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

interface BottomNavItem {
  id: string;
  route: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  operatorOnly?: boolean;
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  {
    id: 'fss',
    route: '/fss',
    label: 'FSS',
    icon: 'local_fire_department',
  },
  {
    id: 'wish_list',
    route: '/wish-list',
    label: 'Wishes',
    icon: 'card_giftcard',
  },
  {
    id: 'tracking',
    route: '/tracking',
    label: 'Tracking',
    icon: 'timer',
  },
  {
    id: 'prompts',
    route: '/prompts',
    label: 'Prompts',
    icon: 'schedule',
    operatorOnly: true,
  },
];

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatRippleModule, MatIconModule],
  template: `
    <nav class="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 shadow-lg dark:shadow-2xl transition-colors pb-safe">
      <div class="grid grid-cols-5 h-14 sm:h-16 max-w-lg mx-auto px-1">
        @for (item of visibleItems(); track item.id) {
          <a
            matRipple
            [routerLink]="item.route"
            routerLinkActive="text-indigo-600 dark:text-indigo-400 font-semibold"
            [routerLinkActiveOptions]="{ exact: false }"
            #rla="routerLinkActive"
            class="flex flex-col items-center justify-center gap-0.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors relative py-1 cursor-pointer"
          >
            @if (rla.isActive) {
              <div class="absolute top-1 w-8 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-sm shadow-indigo-500/50"></div>
            }
            <mat-icon class="!text-xl !w-5 !h-5 transition-transform" [class.scale-110]="rla.isActive">
              {{ item.icon }}
            </mat-icon>
            <span class="text-[10px] tracking-tight truncate max-w-[56px] text-center">
              {{ item.label }}
            </span>
          </a>
        }

        <!-- Menu Drawer Toggle Button -->
        <button
          matRipple
          type="button"
          (click)="toggleMenu.emit()"
          class="flex flex-col items-center justify-center gap-0.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors py-1 cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <mat-icon class="!text-xl !w-5 !h-5">
            menu
          </mat-icon>
          <span class="text-[10px] tracking-tight truncate max-w-[56px] text-center">
            More
          </span>
        </button>
      </div>
    </nav>
  `,
})
export class BottomNavComponent {
  readonly authService = inject(AuthService);
  @Output() toggleMenu = new EventEmitter<void>();

  visibleItems(): BottomNavItem[] {
    const isOperator = this.authService.isOperator();
    const isAdmin = this.authService.isAdmin();

    return BOTTOM_NAV_ITEMS.filter((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.operatorOnly && !isOperator) return false;
      return true;
    });
  }
}
