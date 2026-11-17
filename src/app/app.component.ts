import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { LogoComponent } from './shared/components/logo.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LogoComponent],
  template: `
    @if (authService.isLoading()) {
      <div class="fixed inset-0 z-[9999] min-h-screen bg-[#030712] text-zinc-100 flex flex-col items-center justify-center font-sans select-none">
        <div class="flex flex-col items-center gap-4">
          <app-logo size="xl" className="animate-pulse shadow-xl shadow-indigo-500/20"></app-logo>
          <div class="flex items-center gap-2">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
            <p class="text-sm font-medium text-zinc-400 tracking-wide">Loading Marc Platform...</p>
          </div>
        </div>
      </div>
    }
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
  readonly authService = inject(AuthService);
  // Inject theme service to ensure theme is initialized upon app startup
  readonly themeService = inject(ThemeService);
}
