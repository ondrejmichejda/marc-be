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
import { MatSliderModule } from '@angular/material/slider';
import { MatRippleModule } from '@angular/material/core';
import { FssService } from '../../core/services/fss.service';
import { FssPromptTemplate } from '../../core/models/fss.models';

@Component({
  selector: 'app-fss-prompts',
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
    MatSliderModule,
    MatRippleModule,
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <mat-icon class="!text-indigo-400">square_foot</mat-icon>
            <span>FSS AI Prompt Templates</span>
          </h1>
          <p class="text-xs sm:text-sm text-zinc-400 mt-1">
            Konfigurace AI prompt šablon pro generování 18 technických částí posouzení PBŘ.
          </p>
        </div>
      </div>

      <!-- Messages -->
      @if (successMessage()) {
        <div class="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <span class="flex items-center gap-1.5"><mat-icon class="!text-sm !w-4 !h-4 text-emerald-400">check_circle</mat-icon> {{ successMessage() }}</span>
          <button type="button" (click)="successMessage.set(null)" class="text-emerald-400 hover:text-white">✕</button>
        </div>
      }
      @if (errorMessage()) {
        <div class="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between animate-in fade-in">
          <span class="flex items-center gap-1.5"><mat-icon class="!text-sm !w-4 !h-4 text-rose-400">error</mat-icon> {{ errorMessage() }}</span>
          <button type="button" (click)="errorMessage.set(null)" class="text-rose-400 hover:text-white">✕</button>
        </div>
      }

      <!-- Search & Filters -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <div class="relative flex-1 max-w-md">
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Hledat v názvech polí, klíčích nebo šablonách..."
            class="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500"
          />
          <mat-icon class="!text-zinc-400 !text-sm !w-4 !h-4 absolute left-3 top-2.5">search</mat-icon>
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          <button
            type="button"
            (click)="selectedCategory.set('all')"
            class="px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
            [class]="selectedCategory() === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'"
          >
            Všechny šablony
          </button>
          @for (cat of categories(); track cat) {
            <button
              type="button"
              (click)="selectedCategory.set(cat)"
              class="px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
              [class]="selectedCategory() === cat ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'"
            >
              {{ cat }}
            </button>
          }
        </div>
      </div>

      <!-- Prompts Grid -->
      @if (isLoading()) {
        <div class="py-16 text-center text-zinc-400 text-sm flex flex-col items-center justify-center gap-3">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Načítání prompt šablon...</span>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (p of filteredPrompts(); track p.fieldKey) {
            <mat-card class="flex flex-col justify-between !p-5 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 hover:!border-zinc-700 transition-all space-y-4 !shadow-lg group">
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h3 class="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {{ p.propertyName || p.fieldKey }}
                    </h3>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="text-[11px] font-mono text-indigo-400">{{ p.placeholderKey || ('{{' + p.fieldKey + '}}') }}</span>
                      <span class="text-[10px] text-zinc-500">• {{ p.category }}</span>
                    </div>
                  </div>
                </div>

                @if (p.description) {
                  <p class="text-xs text-zinc-400">{{ p.description }}</p>
                }

                <div class="space-y-1.5">
                  <span class="text-[10px] font-semibold text-zinc-500 block uppercase tracking-wider">AI Prompt:</span>
                  <div class="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs font-mono text-zinc-300 line-clamp-4 leading-relaxed">
                    {{ p.systemPrompt || p.userPrompt || 'Bez promptu' }}
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 pt-1">
                  <span>🤖 Model: <strong class="text-zinc-200">{{ p.model || 'Výchozí' }}</strong></span>
                  <span>📁 Přílohy: <strong class="text-zinc-200">{{ p.includeFiles ? 'Zahrnout' : 'Ne' }}</strong></span>
                  <span>🌡️ Teplota: <strong class="text-zinc-200">{{ p.temperature ?? 0.2 }}</strong></span>
                </div>
              </div>

              <div class="flex items-center justify-end pt-3 border-t border-zinc-800/80">
                <button
                  mat-stroked-button
                  type="button"
                  (click)="openEditModal(p)"
                  class="!rounded-lg !text-xs !font-medium"
                >
                  <mat-icon class="!text-xs !w-3.5 !h-3.5 !mr-1">edit</mat-icon>
                  Upravit šablonu
                </button>
              </div>
            </mat-card>
          }
        </div>
      }

      <!-- Edit Modal -->
      @if (editingPrompt(); as p) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/80 backdrop-blur-sm flex justify-center p-3 sm:p-6 animate-in fade-in">
          <mat-card class="relative w-full max-w-3xl !bg-zinc-900 !border !border-zinc-800 !rounded-2xl !shadow-2xl !p-6 space-y-5">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h2 class="text-base font-bold text-white">Upravit prompt: {{ p.propertyName || p.fieldKey }}</h2>
                <p class="text-xs font-mono text-indigo-400">{{ p.placeholderKey }} • {{ p.category }}</p>
              </div>
              <button
                type="button"
                (click)="editingPrompt.set(null)"
                class="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div class="space-y-4 text-xs">
              <div class="space-y-1.5">
                <label class="block font-semibold text-zinc-300">Popis pole</label>
                <input
                  type="text"
                  [(ngModel)]="editForm.description"
                  class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div class="space-y-1.5">
                <label class="block font-semibold text-zinc-300">AI Model</label>
                <select
                  [(ngModel)]="editForm.model"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs cursor-pointer"
                >
                  <option value="">Výchozí model (dle uživatelského / systémového nastavení)</option>
                  <optgroup label="Doporučené modely">
                    <option value="gpt-4o">GPT-4o (Omni) — Doporučeno pro PBŘ</option>
                    <option value="gpt-4o-mini">GPT-4o mini — Rychlý &amp; Úsporný</option>
                  </optgroup>
                  <optgroup label="GPT-6 generace">
                    <option value="gpt-6-astra">GPT-6 Astra — Vlajkový reasoning</option>
                    <option value="gpt-6.1-sol">GPT-6.1 Sol — Vyvážený GPT-6</option>
                    <option value="gpt-6-luna">GPT-6 Luna — Bleskový &amp; Úsporný</option>
                    <option value="gpt-6-sol">GPT-6 Sol</option>
                    <option value="gpt-6-instant">GPT-6 Instant</option>
                    <option value="gpt-6-cyber">GPT-6 Cyber</option>
                  </optgroup>
                  <optgroup label="Reasoning modely">
                    <option value="o3-mini">o3-mini</option>
                    <option value="o1">o1</option>
                  </optgroup>
                  <optgroup label="Ostatní modely">
                    <option value="gpt-4.5-preview">GPT-4.5 Preview</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </optgroup>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="block font-semibold text-zinc-300">AI Prompt šablona</label>
                <textarea
                  rows="8"
                  [(ngModel)]="editForm.prompt"
                  placeholder="Zadejte instrukce pro model k vygenerování této části PBŘ..."
                  class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                ></textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="font-semibold text-zinc-300">Teplota modelu</label>
                    <span class="font-mono text-indigo-400 font-bold">{{ editForm.temperature }}</span>
                  </div>
                  <mat-slider min="0" max="1" step="0.05" class="w-full">
                    <input matSliderThumb [(ngModel)]="editForm.temperature" />
                  </mat-slider>
                </div>

                <div class="flex items-center gap-3 pt-4">
                  <mat-slide-toggle [(ngModel)]="editForm.includeFiles" color="primary">
                    <span class="text-zinc-200 text-xs font-semibold">Zahrnovat text z nahraných souborů</span>
                  </mat-slide-toggle>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                mat-button
                type="button"
                (click)="editingPrompt.set(null)"
                class="!rounded-xl !text-zinc-300 !text-xs"
              >
                Zrušit
              </button>
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="savePrompt()"
                [disabled]="isSaving()"
                class="!rounded-xl !text-xs !font-semibold"
              >
                <mat-icon class="!text-sm !w-4 !h-4 !mr-1">save</mat-icon>
                {{ isSaving() ? 'Ukládání...' : 'Uložit šablonu' }}
              </button>
            </div>
          </mat-card>
        </div>
      }
    </div>
  `,
})
export class FssPromptsComponent implements OnInit {
  private fssService = inject(FssService);

  readonly prompts = signal<FssPromptTemplate[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('all');

  readonly editingPrompt = signal<FssPromptTemplate | null>(null);
  readonly isSaving = signal<boolean>(false);

  editForm = {
    description: '',
    prompt: '',
    model: '',
    includeFiles: true,
    temperature: 0.2,
  };

  readonly categories = computed<string[]>(() => {
    const set = new Set<string>();
    this.prompts().forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  });

  readonly filteredPrompts = computed<FssPromptTemplate[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();

    return this.prompts().filter((p) => {
      const matchCat = cat === 'all' || p.category === cat;
      const matchQuery =
        !query ||
        p.fieldKey.toLowerCase().includes(query) ||
        (p.propertyName && p.propertyName.toLowerCase().includes(query)) ||
        (p.placeholderKey && p.placeholderKey.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.systemPrompt && p.systemPrompt.toLowerCase().includes(query)) ||
        (p.userPrompt && p.userPrompt.toLowerCase().includes(query)) ||
        (p.model && p.model.toLowerCase().includes(query));

      return matchCat && matchQuery;
    });
  });

  ngOnInit(): void {
    this.loadPrompts();
  }

  loadPrompts(): void {
    this.isLoading.set(true);
    this.fssService.getPrompts().subscribe({
      next: (res) => {
        this.prompts.set(res.prompts || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se načíst prompt šablony.');
        this.isLoading.set(false);
      },
    });
  }

  openEditModal(prompt: FssPromptTemplate): void {
    this.editingPrompt.set(prompt);
    this.editForm = {
      description: prompt.description || '',
      prompt: prompt.systemPrompt || prompt.userPrompt || '',
      model: prompt.model || '',
      includeFiles: prompt.includeFiles ?? true,
      temperature: prompt.temperature ?? 0.2,
    };
  }

  savePrompt(): void {
    const p = this.editingPrompt();
    if (!p) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.fssService
      .updatePrompt(p.fieldKey, {
        description: this.editForm.description,
        systemPrompt: this.editForm.prompt,
        userPrompt: this.editForm.prompt,
        model: this.editForm.model || undefined,
        includeFiles: this.editForm.includeFiles,
        temperature: this.editForm.temperature,
      })
      .subscribe({
        next: () => {
          this.successMessage.set(`Šablona pro '${p.fieldKey}' byla úspěšně uložena.`);
          this.isSaving.set(false);
          this.editingPrompt.set(null);
          this.loadPrompts();
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Chyba při ukládání šablony.');
          this.isSaving.set(false);
        },
      });
  }
}
