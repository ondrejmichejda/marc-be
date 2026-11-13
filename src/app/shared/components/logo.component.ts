import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

let nextLogoId = 0;

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="containerClass()">
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="w-full h-full block select-none"
      >
        <defs>
          <!-- Background Gradient -->
          <linearGradient [id]="'marcBgGrad_' + uniqueId" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4F46E5" />
            <stop offset="55%" stop-color="#3B82F6" />
            <stop offset="100%" stop-color="#06B6D4" />
          </linearGradient>

          <!-- Flame / Spark Gradient -->
          <linearGradient [id]="'marcFlameGrad_' + uniqueId" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#F97316" />
            <stop offset="50%" stop-color="#EF4444" />
            <stop offset="100%" stop-color="#FBBF24" />
          </linearGradient>

          <!-- Shield Subtle Gradient -->
          <linearGradient [id]="'marcShieldGrad_' + uniqueId" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.06" />
          </linearGradient>

          <!-- Ambient Shadow -->
          <filter [id]="'marcShadow_' + uniqueId" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#1E1B4B" flood-opacity="0.35" />
          </filter>
        </defs>

        <!-- Squircle Base -->
        <rect width="36" height="36" rx="9" [attr.fill]="'url(#marcBgGrad_' + uniqueId + ')'" />

        <!-- Subtle Glass Inner Border -->
        <rect x="0.5" y="0.5" width="35" height="35" rx="8.5" stroke="white" stroke-opacity="0.25" stroke-width="1" />

        <!-- Emblem Group with Shadow -->
        <g [attr.filter]="'url(#marcShadow_' + uniqueId + ')'">
          <!-- Outer Shield / Structural Contour -->
          <path
            d="M18 6.5L26 10.2V17.5C26 22.8 22.6 27.6 18 29.5C13.4 27.6 10 22.8 10 17.5V10.2L18 6.5Z"
            [attr.fill]="'url(#marcShieldGrad_' + uniqueId + ')'"
            stroke="white"
            stroke-width="1.25"
            stroke-linejoin="round"
            stroke-opacity="0.9"
          />

          <!-- Modern M-monogram Geometric Structure -->
          <path
            d="M13.5 20.5V13.5L17.5 19L18.5 19L22.5 13.5V20.5"
            stroke="white"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Stylized Central Flame Core (Fire Safety) -->
          <path
            d="M18 10.5C18.8 12.2 20 13.5 20 15.2C20 16.3 19.1 17.2 18 17.2C16.9 17.2 16 16.3 16 15.2C16 13.5 17.2 12.2 18 10.5Z"
            [attr.fill]="'url(#marcFlameGrad_' + uniqueId + ')'"
          />

          <!-- AI Core Anchor Spark -->
          <circle cx="18" cy="24.5" r="1.2" fill="#E0F2FE" />
        </g>
      </svg>
    </div>
  `,
})
export class LogoComponent {
  readonly uniqueId = ++nextLogoId;

  @Input() size: 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'md';
  @Input() className = '';

  readonly containerClass = computed(() => {
    let sizeCls = 'w-9 h-9';
    switch (this.size) {
      case 'sm':
        sizeCls = 'w-7 h-7';
        break;
      case 'md':
        sizeCls = 'w-9 h-9';
        break;
      case 'lg':
        sizeCls = 'w-11 h-11';
        break;
      case 'xl':
        sizeCls = 'w-14 h-14';
        break;
      case '2xl':
        sizeCls = 'w-20 h-20';
        break;
    }

    return `relative flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 rounded-xl overflow-hidden ${sizeCls} ${this.className}`.trim();
  });
}
