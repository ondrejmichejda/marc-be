import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { SidebarComponent } from './sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, SidebarComponent],
  template: `
    <div class="h-screen h-dvh bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans overflow-hidden transition-colors">
      <!-- Top Navbar / Toolbar -->
      <app-navbar class="shrink-0" (toggleSidebar)="toggleMobileSidebar()"></app-navbar>

      <!-- Main Layout with Sidebar and Content -->
      <div class="flex-1 min-h-0 flex overflow-hidden">
        <!-- Sidebar Navigation (always visible on left on desktop, fixed height) -->
        <app-sidebar
          class="shrink-0 h-full flex flex-col"
          [mobileOpen]="mobileSidebarOpen()"
          (closeSidebar)="mobileSidebarOpen.set(false)"
        ></app-sidebar>

        <!-- Main Content Area (only content scrolls) -->
        <main class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-zinc-100/50 dark:bg-zinc-900/30 transition-colors">
          <div class="max-w-7xl mx-auto">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
})
export class AppLayoutComponent {
  readonly mobileSidebarOpen = signal<boolean>(false);

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.set(!this.mobileSidebarOpen());
  }
}
