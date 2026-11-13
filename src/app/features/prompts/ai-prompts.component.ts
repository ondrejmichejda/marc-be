import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { AutoResizeDirective } from '../../core/directives/auto-resize.directive';
import { PromptsService } from '../../core/services/prompts.service';
import {
  ScheduledAiPrompt,
  PromptScheduledTime,
  SCHEDULED_TIME_DETAILS,
  ScheduledPromptsSummary,
  PromptCronBatchSummary,
  RunPromptResponse,
} from '../../core/models/prompts.models';

interface QuickPreset {
  title: string;
  time: PromptScheduledTime;
  prompt: string;
  icon: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    title: 'Early Morning Mindset & Mobility',
    time: '6am',
    icon: '🌄',
    prompt: `Vytvoř ranní motivační zprávu pro BJJ sportovce a inženýry. Zahrň 3 tipy na ranní mobilitu páteře a kyčlí, 1 myšlenku o disciplíně a připomenutí pitného režimu. Zpráva musí být energická, v češtině a vhodná pro Telegram.`,
  },
  {
    title: 'Morning Routine & Daily Focus',
    time: '9am',
    icon: '🌅',
    prompt: `Sestav přehledný denní fokus pro projektování a technické úkoly. Zahrň pravidlo 3 nejdůležitějších úkolů dne (MITs), techniku 50/10 hluboké práce a krátkou připomínku ergonomie sezení. Formátuj s odrážkami pro rychlé čtení.`,
  },
  {
    title: 'Afternoon Energy & BJJ Drill Tip',
    time: '1pm',
    icon: '☀️',
    prompt: `Navrhni odpolední energetický reset po obědě. Zahrň 1 tip na lehké protažení krku a ramen, 1 koncept pro trénink brazilského jiu-jitsu (např. guard retention nebo guard passing) a rychlý tip proti odpolední únavě.`,
  },
  {
    title: 'Evening Reflection & Recovery Protocol',
    time: '5pm',
    icon: '🌇',
    prompt: `Připrav večerní regenerační protokol po náročném pracovním a tréninkovém dni. Zahrň doporučení pro spánkovou hygienu (omezení modrého světla, teplota v ložnici), dechové cvičení (4-7-8) a zhodnocení úspěchů dne.`,
  },
];

@Component({
  selector: 'app-ai-prompts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatRippleModule,
    AutoResizeDirective,
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <mat-icon class="!text-indigo-600 dark:text-indigo-400">schedule</mat-icon>
            <span>Naplánované AI Prompty (Vercel Cron)</span>
          </h1>
          <p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Automatické periodické spouštění AI promptů v pevných slotech (6:00, 9:00, 13:00, 17:00) a odesílání do Telegramu.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            mat-flat-button
            color="primary"
            type="button"
            (click)="openCreateModal()"
            class="!rounded-xl !text-xs sm:!text-sm !font-medium"
          >
            <mat-icon class="!text-base !w-4 !h-4 !mr-1">add</mat-icon>
            <span>Nový naplánovaný prompt</span>
          </button>
        </div>
      </div>

      <!-- Messages -->
      @if (successMessage()) {
        <div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <span class="flex items-center gap-1.5"><mat-icon class="!text-sm !w-4 !h-4 text-emerald-600 dark:text-emerald-400">check_circle</mat-icon> {{ successMessage() }}</span>
          <button type="button" (click)="successMessage.set(null)" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-white">✕</button>
        </div>
      }
      @if (errorMessage()) {
        <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between animate-in fade-in">
          <span class="flex items-center gap-1.5"><mat-icon class="!text-sm !w-4 !h-4 text-rose-600 dark:text-rose-400">error</mat-icon> {{ errorMessage() }}</span>
          <button type="button" (click)="errorMessage.set(null)" class="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-white">✕</button>
        </div>
      }

      <!-- Summary Metrics Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <mat-card class="!p-4 !rounded-2xl !bg-white dark:!bg-zinc-900/80 !border !border-zinc-200 dark:!border-zinc-800 !shadow-sm space-y-1">
          <span class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">Celkem promptů</span>
          <p class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{{ summary()?.total || prompts().length }}</p>
        </mat-card>

        <mat-card class="!p-4 !rounded-2xl !bg-white dark:!bg-zinc-900/80 !border !border-zinc-200 dark:!border-zinc-800 !shadow-sm space-y-1">
          <span class="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">Aktivní v plánovači</span>
          <p class="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-300">{{ summary()?.active || 0 }}</p>
        </mat-card>

        <mat-card class="!p-4 !rounded-2xl !bg-white dark:!bg-zinc-900/80 !border !border-zinc-200 dark:!border-zinc-800 !shadow-sm space-y-1">
          <span class="text-[11px] font-medium text-amber-600 dark:text-amber-400 block">Pozastavené</span>
          <p class="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-300">{{ summary()?.paused || 0 }}</p>
        </mat-card>

        <mat-card class="!p-4 !rounded-2xl !bg-white dark:!bg-zinc-900/80 !border !border-zinc-200 dark:!border-zinc-800 !shadow-sm space-y-1">
          <span class="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 block">Časové sloty</span>
          <p class="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-300">4 / den</p>
        </mat-card>
      </div>

      <!-- Quick Preset Templates -->
      <mat-card class="!p-5 !rounded-2xl !bg-white dark:!bg-zinc-900/80 !border !border-zinc-200 dark:border-zinc-800 !shadow-sm dark:!shadow-lg space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <mat-icon class="!text-amber-500 dark:!text-amber-400 !text-sm !w-4 !h-4">auto_awesome</mat-icon>
            <span>Rychlé předvolby &amp; Šablony slotů</span>
          </h2>
          <span class="text-[11px] text-zinc-500">Kliknutím předvyplníte nový prompt</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          @for (preset of quickPresets; track preset.title) {
            <div
              matRipple
              (click)="applyPreset(preset)"
              class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all cursor-pointer space-y-2 group overflow-hidden"
            >
              <div class="flex items-center justify-between">
                <span class="text-base">{{ preset.icon }}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {{ preset.time }}
                </span>
              </div>
              <h4 class="text-xs font-semibold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-1">
                {{ preset.title }}
              </h4>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {{ preset.prompt }}
              </p>
            </div>
          }
        </div>
      </mat-card>

      <!-- Vercel Cron Simulation Panel -->
      <mat-card class="!p-5 !rounded-2xl !bg-white dark:!bg-zinc-900/80 !border !border-zinc-200 dark:!border-zinc-800 !shadow-sm dark:!shadow-lg space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <mat-icon class="!text-indigo-600 dark:text-indigo-400 !text-sm !w-4 !h-4">play_circle</mat-icon>
              <span>Testovací Spuštění Vercel Cron Běhu</span>
            </h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Simulujte zavolání cron webhooku pro jednotlivé časové sloty nebo všechny sloty najednou.
            </p>
          </div>

          @if (isTriggeringCron()) {
            <span class="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <mat-spinner diameter="16"></mat-spinner>
              <span>Vykonávám cron dávku...</span>
            </span>
          }
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            mat-stroked-button
            type="button"
            (click)="triggerCron('6am')"
            [disabled]="isTriggeringCron()"
            class="!rounded-xl !text-xs !font-medium"
          >
            🌄 Spustit slot 6:00
          </button>
          <button
            mat-stroked-button
            type="button"
            (click)="triggerCron('9am')"
            [disabled]="isTriggeringCron()"
            class="!rounded-xl !text-xs !font-medium"
          >
            🌅 Spustit slot 9:00
          </button>
          <button
            mat-stroked-button
            type="button"
            (click)="triggerCron('1pm')"
            [disabled]="isTriggeringCron()"
            class="!rounded-xl !text-xs !font-medium"
          >
            ☀️ Spustit slot 13:00
          </button>
          <button
            mat-stroked-button
            type="button"
            (click)="triggerCron('5pm')"
            [disabled]="isTriggeringCron()"
            class="!rounded-xl !text-xs !font-medium"
          >
            🌇 Spustit slot 17:00
          </button>
          <button
            mat-flat-button
            color="primary"
            type="button"
            (click)="triggerCron('all')"
            [disabled]="isTriggeringCron()"
            class="!rounded-xl !text-xs !font-semibold"
          >
            <mat-icon class="!text-xs !w-3.5 !h-3.5 !mr-1">bolt</mat-icon>
            Spustit VŠECHNY aktivní prompty
          </button>
        </div>

        @if (cronSummary(); as cs) {
          <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2 animate-in fade-in">
            <div class="flex items-center justify-between font-semibold">
              <span class="text-zinc-900 dark:text-white">Výsledek dávkového běhu ({{ cs.targetTime }}):</span>
              <span class="text-zinc-500 dark:text-zinc-400">Nalezeno: {{ cs.totalFound }} • Úspěšně: {{ cs.successful }} • Selhalo: {{ cs.failed }}</span>
            </div>
            @if (cs.results && cs.results.length > 0) {
              <div class="divide-y divide-zinc-200 dark:divide-zinc-800/60 max-h-48 overflow-y-auto pr-1">
                @for (r of cs.results; track r.promptId) {
                  <div class="py-2 flex items-center justify-between gap-2">
                    <div class="truncate">
                      <span class="font-medium text-zinc-900 dark:text-zinc-200">{{ r.title }}</span>
                      <span class="text-[10px] text-zinc-500 ml-2">({{ r.durationMs }} ms)</span>
                      @if (r.telegramDelivery?.sent) {
                        <span class="text-[10px] text-emerald-600 dark:text-emerald-400 ml-2">✓ Telegram odeslán</span>
                      }
                    </div>
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-semibold"
                      [class]="r.success ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'"
                    >
                      {{ r.success ? 'OK' : 'Chyba' }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>
        }
      </mat-card>

      <!-- Search & Slot Filter Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-xs dark:shadow-none">
        <div class="relative flex-1 max-w-md">
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Hledat v názvech a textech promptů..."
            class="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
          <mat-icon class="!text-zinc-400 dark:!text-zinc-500 !text-sm !w-4 !h-4 absolute left-3 top-2.5">search</mat-icon>
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            type="button"
            (click)="selectedTimeFilter.set('all')"
            class="px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
            [class]="selectedTimeFilter() === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          >
            Všechny časy
          </button>
          <button
            type="button"
            (click)="selectedTimeFilter.set('6am')"
            class="px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
            [class]="selectedTimeFilter() === '6am' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          >
            🌄 6:00 AM
          </button>
          <button
            type="button"
            (click)="selectedTimeFilter.set('9am')"
            class="px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
            [class]="selectedTimeFilter() === '9am' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          >
            🌅 9:00 AM
          </button>
          <button
            type="button"
            (click)="selectedTimeFilter.set('1pm')"
            class="px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
            [class]="selectedTimeFilter() === '1pm' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          >
            ☀️ 13:00 PM
          </button>
          <button
            type="button"
            (click)="selectedTimeFilter.set('5pm')"
            class="px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
            [class]="selectedTimeFilter() === '5pm' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'"
          >
            🌇 17:00 PM
          </button>
        </div>
      </div>

      <!-- Prompts List Grid -->
      @if (isLoading()) {
        <div class="py-16 text-center text-zinc-500 dark:text-zinc-400 text-sm flex flex-col items-center justify-center gap-3">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Načítání naplánovaných promptů...</span>
        </div>
      } @else if (filteredPrompts().length === 0) {
        <div class="py-16 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-400 space-y-3 shadow-xs dark:shadow-none">
          <mat-icon class="!text-4xl !w-10 !h-10 text-zinc-400 dark:text-zinc-500 mx-auto">schedule</mat-icon>
          <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-300">Žádné naplánované prompty pro zvolený filtr</p>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">Vytvořte naplánovaný prompt nebo použijte jednu z rychlých šablon výše.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (p of filteredPrompts(); track p.id) {
            <mat-card class="flex flex-col justify-between !p-5 !rounded-2xl !bg-white dark:!bg-zinc-900/80 !border !border-zinc-200 dark:!border-zinc-800 hover:!border-zinc-300 dark:hover:!border-zinc-700 transition-all space-y-4 !shadow-sm dark:!shadow-lg group">
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                      {{ p.title }}
                    </h3>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold" [class]="getTimeBadgeClass(p.scheduledTime)">
                        {{ getTimeLabel(p.scheduledTime) }}
                      </span>
                      <span class="text-[10px] text-zinc-500">• Model: {{ p.model || 'gpt-4o' }}</span>
                    </div>
                  </div>

                  <mat-slide-toggle
                    [checked]="p.isActive"
                    (change)="toggleActive(p)"
                    color="primary"
                    [matTooltip]="p.isActive ? 'Kliknutím pozastavíte' : 'Kliknutím aktivujete'"
                  >
                    <span class="text-[10px] font-semibold" [class.text-emerald-600]="p.isActive" [class.dark:text-emerald-400]="p.isActive" [class.text-zinc-400]="!p.isActive">
                      {{ p.isActive ? 'Aktivní' : 'Vypnuto' }}
                    </span>
                  </mat-slide-toggle>
                </div>

                <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-300 line-clamp-3 leading-relaxed">
                  {{ p.prompt }}
                </div>

                @if (p.lastRunResult) {
                  <div class="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 text-[11px] space-y-1">
                    <span class="text-zinc-500 block text-[10px]">Poslední běh ({{ p.lastRunAt | date:'short' }}):</span>
                    <p class="text-zinc-700 dark:text-zinc-300 line-clamp-2 italic">"{{ p.lastRunResult }}"</p>
                  </div>
                }
              </div>

              <div class="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  mat-stroked-button
                  type="button"
                  (click)="runNow(p)"
                  [disabled]="runningId() === p.id"
                  class="!rounded-lg !text-xs !font-medium"
                >
                  <mat-icon class="!text-xs !w-3.5 !h-3.5 !mr-1 text-amber-500 dark:text-amber-400">bolt</mat-icon>
                  <span>{{ runningId() === p.id ? 'Spouštím...' : 'Spustit ihned' }}</span>
                </button>

                <div class="flex items-center gap-1">
                  <button
                    mat-icon-button
                    type="button"
                    (click)="openEditModal(p)"
                    class="!text-zinc-500 dark:!text-zinc-300 hover:!text-zinc-900 dark:hover:!text-white"
                    matTooltip="Upravit prompt"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    (click)="deletePrompt(p.id)"
                    class="!text-zinc-400 dark:!text-zinc-500 hover:!text-rose-600 dark:hover:!text-rose-400"
                    matTooltip="Smazat prompt"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </mat-card>
          }
        </div>
      }

      <!-- Modal: Create / Edit Prompt -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-sm flex justify-center p-3 sm:p-6 animate-in fade-in">
          <div class="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h2 class="text-base font-bold text-zinc-900 dark:text-white">
                  {{ editingId() ? 'Upravit naplánovaný prompt' : 'Nový naplánovaný prompt' }}
                </h2>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">Zadejte text promptu a vyberte denní čas spuštění.</p>
              </div>
              <button
                type="button"
                (click)="closeModal()"
                class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div class="space-y-4 text-xs">
              <div class="space-y-1.5">
                <label class="block font-semibold text-zinc-700 dark:text-zinc-300">Název / Cíl promptu</label>
                <input
                  type="text"
                  [(ngModel)]="formTitle"
                  placeholder="např. Ranní motivační zpráva & BJJ tip"
                  class="w-full px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div class="space-y-1.5">
                <label class="block font-semibold text-zinc-700 dark:text-zinc-300">Časový slot spuštění</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    (click)="formScheduledTime = '6am'"
                    class="py-2 px-3 rounded-xl font-medium border text-center transition-all cursor-pointer"
                    [class]="formScheduledTime === '6am' ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'"
                  >
                    🌄 6:00 AM
                  </button>
                  <button
                    type="button"
                    (click)="formScheduledTime = '9am'"
                    class="py-2 px-3 rounded-xl font-medium border text-center transition-all cursor-pointer"
                    [class]="formScheduledTime === '9am' ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'"
                  >
                    🌅 9:00 AM
                  </button>
                  <button
                    type="button"
                    (click)="formScheduledTime = '1pm'"
                    class="py-2 px-3 rounded-xl font-medium border text-center transition-all cursor-pointer"
                    [class]="formScheduledTime === '1pm' ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'"
                  >
                    ☀️ 13:00 PM
                  </button>
                  <button
                    type="button"
                    (click)="formScheduledTime = '5pm'"
                    class="py-2 px-3 rounded-xl font-medium border text-center transition-all cursor-pointer"
                    [class]="formScheduledTime === '5pm' ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'"
                  >
                    🌇 17:00 PM
                  </button>
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="block font-semibold text-zinc-700 dark:text-zinc-300">Text AI promptu</label>
                <textarea
                  autoResize
                  [autoResize]="formPrompt"
                  rows="5"
                  [(ngModel)]="formPrompt"
                  placeholder="Zadejte podrobné instrukce pro model..."
                  class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed resize-none overflow-hidden"
                ></textarea>
              </div>

              <div class="flex items-center gap-2 pt-2">
                <label class="flex items-center gap-2 cursor-pointer text-zinc-800 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    [(ngModel)]="formIsActive"
                    class="rounded bg-zinc-100 dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-0 h-4 w-4"
                  />
                  <span>Aktivní v plánovači úloh (Cron)</span>
                </label>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                (click)="closeModal()"
                class="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="button"
                (click)="savePrompt()"
                [disabled]="isSaving() || !formPrompt"
                class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-md disabled:opacity-50"
              >
                {{ isSaving() ? 'Ukládání...' : (editingId() ? 'Uložit změny' : 'Vytvořit prompt') }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Run Result Inspection -->
      @if (lastRunResponse(); as run) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-sm flex justify-center p-3 sm:p-6 animate-in fade-in">
          <div class="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 class="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>⚡ Výsledek spuštění promptu</span>
                </h3>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">Výstup byl vygenerován modelem a zpracován.</p>
              </div>
              <button
                type="button"
                (click)="lastRunResponse.set(null)"
                class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div class="space-y-3 text-xs">
              <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans max-h-96 overflow-y-auto">
                {{ run.completion || run.execution?.completionPreview || 'Žádný textový výstup' }}
              </div>

              @if (run.execution?.telegramDelivery; as tg) {
                <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <span class="text-zinc-600 dark:text-zinc-400">Doručení do Telegramu:</span>
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-semibold"
                    [class]="tg.sent ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'"
                  >
                    {{ tg.sent ? '✓ Odesláno odběrateli' : (tg.error || 'Nebylo odesláno') }}
                  </span>
                </div>
              }
            </div>

            <div class="flex justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                (click)="lastRunResponse.set(null)"
                class="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white text-xs font-medium cursor-pointer"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AiPromptsComponent implements OnInit {
  private promptsService = inject(PromptsService);

  readonly prompts = signal<ScheduledAiPrompt[]>([]);
  readonly summary = signal<ScheduledPromptsSummary | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly searchQuery = signal<string>('');
  readonly selectedTimeFilter = signal<string>('all');

  readonly isModalOpen = signal<boolean>(false);
  readonly editingId = signal<string | null>(null);
  readonly isSaving = signal<boolean>(false);
  readonly runningId = signal<string | null>(null);
  readonly isTriggeringCron = signal<boolean>(false);

  readonly lastRunResponse = signal<RunPromptResponse | null>(null);
  readonly cronSummary = signal<PromptCronBatchSummary | null>(null);

  readonly quickPresets = QUICK_PRESETS;

  formTitle: string = '';
  formScheduledTime: PromptScheduledTime = '9am';
  formPrompt: string = '';
  formIsActive: boolean = true;

  readonly filteredPrompts = computed<ScheduledAiPrompt[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const timeFilter = this.selectedTimeFilter();

    return this.prompts().filter((p) => {
      const matchTime = timeFilter === 'all' || p.scheduledTime === timeFilter;
      const matchQuery =
        !query ||
        p.title.toLowerCase().includes(query) ||
        p.prompt.toLowerCase().includes(query);

      return matchTime && matchQuery;
    });
  });

  ngOnInit(): void {
    this.loadPrompts();
  }

  loadPrompts(): void {
    this.isLoading.set(true);
    this.promptsService.getPrompts().subscribe({
      next: (res) => {
        this.prompts.set(res.prompts || []);
        this.summary.set(res.summary || null);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se načíst naplánované prompty.');
        this.isLoading.set(false);
      },
    });
  }

  applyPreset(preset: QuickPreset): void {
    this.editingId.set(null);
    this.formTitle = preset.title;
    this.formScheduledTime = preset.time;
    this.formPrompt = preset.prompt;
    this.formIsActive = true;
    this.isModalOpen.set(true);
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.formTitle = '';
    this.formScheduledTime = '9am';
    this.formPrompt = '';
    this.formIsActive = true;
    this.isModalOpen.set(true);
  }

  openEditModal(prompt: ScheduledAiPrompt): void {
    this.editingId.set(prompt.id);
    this.formTitle = prompt.title;
    this.formScheduledTime = prompt.scheduledTime;
    this.formPrompt = prompt.prompt;
    this.formIsActive = prompt.isActive;
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingId.set(null);
  }

  savePrompt(): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload = {
      title: this.formTitle || 'Naplánovaný prompt',
      scheduledTime: this.formScheduledTime,
      prompt: this.formPrompt,
      isActive: this.formIsActive,
    };

    const id = this.editingId();
    if (id) {
      this.promptsService.updatePrompt(id, payload).subscribe({
        next: () => {
          this.successMessage.set('Naplánovaný prompt byl úspěšně upraven.');
          this.isSaving.set(false);
          this.closeModal();
          this.loadPrompts();
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Chyba při ukládání promptu.');
          this.isSaving.set(false);
        },
      });
    } else {
      this.promptsService.createPrompt(payload).subscribe({
        next: () => {
          this.successMessage.set('Nový naplánovaný prompt byl vytvořen.');
          this.isSaving.set(false);
          this.closeModal();
          this.loadPrompts();
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Chyba při vytváření promptu.');
          this.isSaving.set(false);
        },
      });
    }
  }

  toggleActive(prompt: ScheduledAiPrompt): void {
    this.promptsService
      .updatePrompt(prompt.id, { isActive: !prompt.isActive })
      .subscribe({
        next: () => {
          this.loadPrompts();
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Chyba při změně stavu promptu.');
        },
      });
  }

  deletePrompt(id: string): void {
    if (!confirm('Opravdu chcete tento naplánovaný prompt smazat?')) return;

    this.promptsService.deletePrompt(id).subscribe({
      next: () => {
        this.successMessage.set('Prompt byl smazán.');
        this.loadPrompts();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při mazání promptu.');
      },
    });
  }

  runNow(prompt: ScheduledAiPrompt): void {
    this.runningId.set(prompt.id);
    this.promptsService.runPrompt(prompt.id).subscribe({
      next: (res) => {
        this.lastRunResponse.set(res);
        this.runningId.set(null);
        this.loadPrompts();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při spouštění promptu.');
        this.runningId.set(null);
      },
    });
  }

  triggerCron(slot: string): void {
    this.isTriggeringCron.set(true);
    this.cronSummary.set(null);

    this.promptsService.triggerCronBatch(slot).subscribe({
      next: (res) => {
        this.cronSummary.set(res);
        this.isTriggeringCron.set(false);
        this.loadPrompts();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při spouštění cron dávky.');
        this.isTriggeringCron.set(false);
      },
    });
  }

  getTimeLabel(slot: PromptScheduledTime): string {
    return SCHEDULED_TIME_DETAILS[slot]?.timeLabel || slot;
  }

  getTimeBadgeClass(slot: PromptScheduledTime): string {
    return SCHEDULED_TIME_DETAILS[slot]?.colorClass?.badge || 'bg-zinc-800 text-zinc-300';
  }
}
