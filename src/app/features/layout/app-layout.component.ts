import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { SidebarComponent } from './sidebar.component';
import { BottomNavComponent } from './bottom-nav.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent, BottomNavComponent],
  template: `
    <div class="h-screen h-dvh bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans overflow-hidden transition-colors">
      <!-- Top Navbar / Toolbar -->
      <app-navbar class="shrink-0" (toggleSidebar)="toggleMobileSidebar()"></app-navbar>

      <!-- Main Layout with Sidebar and Content -->
      <div class="flex-1 min-h-0 flex overflow-hidden relative">
        <!-- Sidebar Navigation (always visible on left on desktop, drawer on mobile) -->
        <app-sidebar
          class="shrink-0 h-full flex flex-col"
          [mobileOpen]="mobileSidebarOpen()"
          (closeSidebar)="mobileSidebarOpen.set(false)"
        ></app-sidebar>

        <!-- Main Content Area (only content scrolls, with bottom padding for mobile nav bar) -->
        <main class="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-20 lg:pb-8 bg-zinc-100/50 dark:bg-zinc-900/30 transition-colors overscroll-y-contain">
          <div class="max-w-7xl mx-auto w-full">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>

      <!-- Mobile Bottom Navigation Bar -->
      <app-bottom-nav (toggleMenu)="toggleMobileSidebar()"></app-bottom-nav>
    </div>
  `,
})
export class AppLayoutComponent {
  readonly mobileSidebarOpen = signal<boolean>(false);

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.set(!this.mobileSidebarOpen());
  }
}
