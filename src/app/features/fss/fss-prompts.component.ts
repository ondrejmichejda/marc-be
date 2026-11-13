import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { MatRippleModule } from '@angular/material/core';
import { AutoResizeDirective } from '../../core/directives/auto-resize.directive';
import { FssService } from '../../core/services/fss.service';
import { FssPromptTemplate, FssTemplate, FSS_PROPERTY_FIELDS } from '../../core/models/fss.models';

export type FssPromptsTab = 'prompts' | 'template';

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
    AutoResizeDirective,
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <mat-icon class="!text-indigo-400">square_foot</mat-icon>
            <span>FSS AI Prompts &amp; Šablony PBŘ</span>
          </h1>
          <p class="text-xs sm:text-sm text-zinc-400 mt-1">
            Konfigurace AI prompt šablon a správa dokumentové šablony (template.docx) pro finální exporty posouzení PBŘ.
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

      <!-- Main Navigation Tabs -->
      <div class="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <button
          matRipple
          type="button"
          (click)="switchTab('prompts')"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer"
          [class]="activeTab() === 'prompts' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'"
        >
          <mat-icon class="!text-sm !w-4 !h-4">smart_toy</mat-icon>
          <span>AI Prompt Šablony (18 vlastností)</span>
        </button>

        <button
          matRipple
          type="button"
          (click)="switchTab('template')"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer relative"
          [class]="activeTab() === 'template' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'"
        >
          <mat-icon class="!text-sm !w-4 !h-4">description</mat-icon>
          <span>DOCX Šablona (template.docx)</span>
          @if (activeTemplate()) {
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              v{{ activeTemplate()?.version }}
            </span>
          } @else {
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">
              výchozí
            </span>
          }
        </button>
      </div>

      <!-- TAB 1: PROMPTS -->
      @if (activeTab() === 'prompts') {
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
        @if (isLoadingPrompts()) {
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
                      <div class="flex items-center gap-2 mt-1">
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                          {{ p.placeholderKey || ('{{' + p.fieldKey + '}}') }}
                        </span>
                        @if (p.category) {
                          <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-500/20">
                            {{ p.category }}
                          </span>
                        }
                      </div>
                    </div>

                    <button
                      mat-stroked-button
                      type="button"
                      (click)="openEditModal(p)"
                      class="!rounded-xl !text-xs !border-zinc-700 hover:!bg-zinc-800 !text-zinc-200"
                    >
                      <mat-icon class="!text-sm !w-4 !h-4 !mr-1">edit</mat-icon>
                      Upravit
                    </button>
                  </div>

                  <p class="text-xs text-zinc-400 line-clamp-2">
                    {{ p.description || 'Bez popisu' }}
                  </p>

                  <div class="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-300 font-mono line-clamp-3 whitespace-pre-wrap select-all">
                    {{ p.systemPrompt || p.userPrompt }}
                  </div>
                </div>

                <div class="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                  <div class="flex items-center gap-3">
                    <span class="flex items-center gap-1">
                      <mat-icon class="!text-xs !w-3.5 !h-3.5 text-zinc-500">model_training</mat-icon>
                      {{ p.model || 'výchozí model' }}
                    </span>
                    <span class="flex items-center gap-1">
                      <mat-icon class="!text-xs !w-3.5 !h-3.5 text-zinc-500">attach_file</mat-icon>
                      {{ p.includeFiles ? 'Přílohy zapnuty' : 'Bez příloh' }}
                    </span>
                  </div>
                  @if (p.updatedAt) {
                    <span>{{ p.updatedAt | date:'d.M.yyyy HH:mm' }}</span>
                  }
                </div>
              </mat-card>
            }
          </div>
        }
      }

      <!-- TAB 2: DOCX TEMPLATE MANAGEMENT -->
      @if (activeTab() === 'template') {
        @if (isLoadingTemplates()) {
          <div class="py-16 text-center text-zinc-400 text-sm flex flex-col items-center justify-center gap-3">
            <mat-spinner diameter="32"></mat-spinner>
            <span>Načítání informací o šabloně DOCX...</span>
          </div>
        } @else {
          <!-- Active Template Banner -->
          <div class="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-indigo-950/40 border border-zinc-800 space-y-4 shadow-xl">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div class="space-y-1.5">
                <div class="flex items-center gap-2.5">
                  <span class="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                    <mat-icon class="!text-2xl !w-6 !h-6">file_present</mat-icon>
                  </span>
                  <div>
                    <div class="flex items-center gap-2">
                      <h2 class="text-base sm:text-lg font-bold text-white">
                        {{ activeTemplate() ? activeTemplate()?.name : 'Výchozí systémová šablona (template.docx)' }}
                      </h2>
                      @if (activeTemplate()) {
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Aktivní verze v{{ activeTemplate()?.version }}
                        </span>
                      } @else {
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          Výchozí vestavěná
                        </span>
                      }
                    </div>
                    <p class="text-xs text-zinc-400 mt-0.5">
                      Tato šablona je automaticky používána jako zdrojový formát pro generování a export kompletního posouzení PBŘ do Wordu (.docx).
                    </p>
                  </div>
                </div>
              </div>

              <!-- Action buttons -->
              <div class="flex flex-wrap items-center gap-2">
                <button
                  mat-flat-button
                  type="button"
                  (click)="downloadActiveTemplate()"
                  class="!rounded-xl !bg-indigo-600 hover:!bg-indigo-500 !text-white !text-xs !font-semibold !px-4 !py-2 shadow-md cursor-pointer"
                >
                  <mat-icon class="!text-sm !w-4 !h-4 !mr-1">download</mat-icon>
                  Stáhnout aktivní DOCX
                </button>

                <button
                  mat-stroked-button
                  type="button"
                  (click)="downloadDefaultTemplate()"
                  class="!rounded-xl !border-zinc-700 hover:!bg-zinc-800 !text-zinc-300 !text-xs cursor-pointer"
                  matTooltip="Stáhne původní výchozí šablonu PBŘ"
                >
                  <mat-icon class="!text-sm !w-4 !h-4 !mr-1">history</mat-icon>
                  Výchozí šablona
                </button>

                @if (activeTemplate()) {
                  <button
                    mat-stroked-button
                    type="button"
                    (click)="resetToDefaultTemplate()"
                    [disabled]="isResetting()"
                    class="!rounded-xl !border-rose-500/30 hover:!bg-rose-950/30 !text-rose-300 !text-xs cursor-pointer"
                    matTooltip="Deaktivuje nahranou šablonu a vrátí se k výchozí šabloně"
                  >
                    <mat-icon class="!text-sm !w-4 !h-4 !mr-1">restart_alt</mat-icon>
                    Obnovit výchozí
                  </button>
                }
              </div>
            </div>

            <!-- Metadata info tiles -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-800/80">
              <div class="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60">
                <span class="text-[11px] text-zinc-400 block font-medium">Stav šablony</span>
                <span class="text-xs font-semibold text-white mt-0.5 block">
                  {{ activeTemplate() ? 'Uživatelská (přepsaná)' : 'Výchozí systémová' }}
                </span>
              </div>

              <div class="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60">
                <span class="text-[11px] text-zinc-400 block font-medium">Velikost souboru</span>
                <span class="text-xs font-semibold text-white mt-0.5 block">
                  {{ activeTemplate() ? formatBytes(activeTemplate()!.size) : 'cca 22 KB' }}
                </span>
              </div>

              <div class="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60">
                <span class="text-[11px] text-zinc-400 block font-medium">Nahráno</span>
                <span class="text-xs font-semibold text-white mt-0.5 block">
                  {{ activeTemplate() ? (activeTemplate()!.uploadedAt | date:'d.M.yyyy HH:mm') : 'Systémový start' }}
                </span>
              </div>

              <div class="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60">
                <span class="text-[11px] text-zinc-400 block font-medium">Nalezené zástupné značky</span>
                <span class="text-xs font-semibold text-emerald-400 mt-0.5 block flex items-center gap-1">
                  <mat-icon class="!text-xs !w-3.5 !h-3.5">verified</mat-icon>
                  {{ activeTemplate() ? (activeTemplate()!.placeholdersCount + ' značek') : '19 značek (kompletní)' }}
                </span>
              </div>
            </div>

            @if (activeTemplate()?.notes) {
              <div class="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-center gap-2">
                <mat-icon class="!text-sm !w-4 !h-4 text-indigo-400">info</mat-icon>
                <span><strong>Poznámka k verzi:</strong> {{ activeTemplate()?.notes }}</span>
              </div>
            }
          </div>

          <!-- Upload Override Card -->
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 space-y-4 !shadow-lg">
            <div class="flex items-center gap-2">
              <mat-icon class="!text-indigo-400">cloud_upload</mat-icon>
              <div>
                <h3 class="text-sm sm:text-base font-bold text-white">Nahrát novou verzi šablony (Přepsat template.docx)</h3>
                <p class="text-xs text-zinc-400">
                  Nahrajte upravený Word dokument (.docx). Nově nahraná šablona okamžitě nahradí stávající a bude použita pro všechna nová generování PBŘ.
                </p>
              </div>
            </div>

            <!-- Dropzone -->
            <div
              (dragover)="onDragOver($event)"
              (drop)="onDrop($event)"
              class="border-2 border-dashed border-zinc-700/80 hover:border-indigo-500 rounded-2xl p-6 text-center transition-colors bg-zinc-950/40 space-y-3 cursor-pointer"
              (click)="fileInput.click()"
            >
              <input
                #fileInput
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                class="hidden"
                (change)="onFileSelected($event)"
              />

              <div class="flex flex-col items-center justify-center gap-2 text-zinc-400">
                <mat-icon class="!text-4xl !w-10 !h-10 text-indigo-400">upload_file</mat-icon>
                @if (selectedUploadFile()) {
                  <div class="space-y-1">
                    <p class="text-sm font-semibold text-white">{{ selectedUploadFile()?.name }}</p>
                    <p class="text-xs text-zinc-400">{{ formatBytes(selectedUploadFile()!.size) }}</p>
                  </div>
                } @else {
                  <div>
                    <p class="text-xs sm:text-sm font-medium text-white">Přetáhněte sem soubor .docx nebo klikněte pro výběr</p>
                    <p class="text-[11px] text-zinc-500 mt-1">Podporován pouze formát Microsoft Word (.docx)</p>
                  </div>
                }
              </div>
            </div>

            <!-- Upload Form fields -->
            <div class="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                [(ngModel)]="uploadNotes"
                placeholder="Nepovinná poznámka k této verzi (např. Aktualizace hlavičky a loga společnosti)..."
                class="flex-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />

              <button
                mat-flat-button
                type="button"
                [disabled]="!selectedUploadFile() || isUploading()"
                (click)="uploadTemplate()"
                class="w-full sm:w-auto !rounded-xl !bg-indigo-600 hover:!bg-indigo-500 !text-white !text-xs !font-semibold !px-6 !py-2.5 shadow-md cursor-pointer shrink-0 disabled:!opacity-50"
              >
                @if (isUploading()) {
                  <span class="flex items-center gap-2">
                    <mat-spinner diameter="16"></mat-spinner>
                    Nahrávání...
                  </span>
                } @else {
                  <span class="flex items-center gap-1.5">
                    <mat-icon class="!text-sm !w-4 !h-4">publish</mat-icon>
                    Nahrát a aktivovat šablonu
                  </span>
                }
              </button>
            </div>
          </mat-card>

          <!-- Placeholders Reference Inspector -->
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 space-y-4 !shadow-lg">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <mat-icon class="!text-indigo-400">code</mat-icon>
                  <span>Podporované značky v šabloně (Placeholders)</span>
                </h3>
                <p class="text-xs text-zinc-400 mt-0.5">
                  V dokumentu DOCX použijte značky ve formátu <code class="text-indigo-300 font-mono">{{ '{{' }}NAZEV_ZNACKY{{ '}}' }}</code>.
                  Při generování dojde k jejich automatickému nahrazení vygenerovaným obsahem.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              @for (field of propertyFields; track field.key) {
                <div class="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-2 hover:border-zinc-700 transition-colors">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono text-[11px] font-bold text-indigo-300 truncate">
                        {{ field.placeholder }}
                      </span>
                    </div>
                    <span class="text-[11px] text-zinc-400 block truncate mt-0.5">{{ field.label }}</span>
                  </div>

                  <div class="flex items-center gap-1 shrink-0">
                    @if (isPlaceholderInActiveTemplate(field.placeholder)) {
                      <span
                        matTooltip="Značka nalezena v aktivní šabloně"
                        class="p-1 rounded-lg bg-emerald-500/10 text-emerald-400"
                      >
                        <mat-icon class="!text-sm !w-4 !h-4">check</mat-icon>
                      </span>
                    }
                    <button
                      type="button"
                      (click)="copyPlaceholder(field.placeholder)"
                      matTooltip="Kopírovat do schránky"
                      class="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <mat-icon class="!text-sm !w-4 !h-4">content_copy</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          </mat-card>

          <!-- Version History -->
          @if (templates().length > 0) {
            <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 space-y-4 !shadow-lg">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <mat-icon class="!text-indigo-400">history</mat-icon>
                    <span>Historie verzí šablony</span>
                  </h3>
                  <p class="text-xs text-zinc-400">
                    Seznam všech nahraných verzí. Kdykoliv můžete aktivovat předchozí verzi nebo smazat staré.
                  </p>
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-zinc-300">
                  <thead class="text-[11px] font-semibold uppercase text-zinc-400 border-b border-zinc-800 bg-zinc-950/40">
                    <tr>
                      <th class="p-3">Verze</th>
                      <th class="p-3">Název souboru</th>
                      <th class="p-3">Velikost</th>
                      <th class="p-3">Nahráno</th>
                      <th class="p-3">Nahrál</th>
                      <th class="p-3">Poznámka</th>
                      <th class="p-3">Stav</th>
                      <th class="p-3 text-right">Akce</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-800/60">
                    @for (tpl of templates(); track tpl.id) {
                      <tr class="hover:bg-zinc-800/30 transition-colors">
                        <td class="p-3 font-bold text-white">v{{ tpl.version }}</td>
                        <td class="p-3 font-medium text-white flex items-center gap-2">
                          <mat-icon class="!text-xs !w-4 !h-4 text-indigo-400">description</mat-icon>
                          <span>{{ tpl.name }}</span>
                        </td>
                        <td class="p-3 text-zinc-400">{{ formatBytes(tpl.size) }}</td>
                        <td class="p-3 text-zinc-400">{{ tpl.uploadedAt | date:'d.M.yyyy HH:mm' }}</td>
                        <td class="p-3 text-zinc-300">{{ tpl.uploadedBy }}</td>
                        <td class="p-3 text-zinc-400 max-w-xs truncate">{{ tpl.notes || '—' }}</td>
                        <td class="p-3">
                          @if (tpl.isActive) {
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Aktivní
                            </span>
                          } @else {
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400">
                              Archivováno
                            </span>
                          }
                        </td>
                        <td class="p-3 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            @if (!tpl.isActive) {
                              <button
                                mat-stroked-button
                                type="button"
                                (click)="activateTemplateVersion(tpl.id)"
                                class="!rounded-lg !text-[11px] !py-1 !px-2.5 !border-zinc-700 hover:!bg-zinc-800 !text-indigo-300"
                              >
                                Aktivovat
                              </button>
                            }
                            <button
                              type="button"
                              (click)="downloadSpecificTemplate(tpl.id, tpl.name)"
                              matTooltip="Stáhnout tuto verzi"
                              class="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <mat-icon class="!text-sm !w-4 !h-4">download</mat-icon>
                            </button>
                            <button
                              type="button"
                              (click)="deleteTemplateVersion(tpl.id)"
                              matTooltip="Smazat tuto verzi"
                              class="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <mat-icon class="!text-sm !w-4 !h-4">delete</mat-icon>
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </mat-card>
          }
        }
      }

      <!-- Edit Modal (Prompts) -->
      @if (editingPrompt()) {
        <div class="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <mat-card class="w-full max-w-2xl !p-6 !rounded-2xl !bg-zinc-900 !border !border-zinc-800 space-y-5 !shadow-2xl animate-in zoom-in-95">
            <div class="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div class="space-y-0.5">
                <h2 class="text-base font-bold text-white flex items-center gap-2">
                  <mat-icon class="!text-indigo-400">edit_note</mat-icon>
                  <span>Upravit prompt: {{ editingPrompt()?.propertyName || editingPrompt()?.fieldKey }}</span>
                </h2>
                <p class="text-xs text-zinc-400">
                  Klíč: <code class="text-indigo-300">{{ editingPrompt()?.placeholderKey }}</code>
                </p>
              </div>
              <button
                type="button"
                (click)="editingPrompt.set(null)"
                class="text-zinc-400 hover:text-white text-lg p-1 rounded-lg hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <div class="space-y-4">
              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-zinc-300">Popis pole</label>
                <input
                  type="text"
                  [(ngModel)]="editForm.description"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-xs font-semibold text-zinc-300">Systémový a uživatelský Prompt</label>
                <textarea
                  autoResize
                  [autoResize]="editForm.prompt"
                  rows="6"
                  [(ngModel)]="editForm.prompt"
                  class="w-full p-3.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 resize-none overflow-hidden"
                ></textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-xs font-semibold text-zinc-300">Model (volitelné přepsání)</label>
                  <input
                    type="text"
                    [(ngModel)]="editForm.model"
                    placeholder="např. gpt-4o, gpt-4o-mini"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-semibold text-zinc-300">Teplota (Temperature)</label>
                    <span class="text-xs font-mono text-indigo-400">{{ editForm.temperature }}</span>
                  </div>
                  <mat-slider min="0" max="1" step="0.05" class="w-full">
                    <input matSliderThumb [(ngModel)]="editForm.temperature" />
                  </mat-slider>
                </div>
              </div>

              <div class="pt-2">
                <mat-slide-toggle [(ngModel)]="editForm.includeFiles" color="primary">
                  <span class="text-xs text-zinc-300">Zahrnout technické přílohy do kontextu OpenAI</span>
                </mat-slide-toggle>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                mat-button
                type="button"
                (click)="editingPrompt.set(null)"
                class="!rounded-xl !text-xs !text-zinc-400 hover:!text-white"
              >
                Zrušit
              </button>
              <button
                mat-flat-button
                type="button"
                color="primary"
                [disabled]="isSaving()"
                (click)="savePrompt()"
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly propertyFields = FSS_PROPERTY_FIELDS;

  readonly activeTab = signal<FssPromptsTab>('prompts');
  readonly prompts = signal<FssPromptTemplate[]>([]);
  readonly templates = signal<FssTemplate[]>([]);
  readonly activeTemplate = signal<FssTemplate | null>(null);

  readonly isLoadingPrompts = signal<boolean>(true);
  readonly isLoadingTemplates = signal<boolean>(false);
  readonly isUploading = signal<boolean>(false);
  readonly isResetting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly searchQuery = signal<string>('');
  readonly selectedCategory = signal<string>('all');

  readonly editingPrompt = signal<FssPromptTemplate | null>(null);
  readonly isSaving = signal<boolean>(false);

  readonly selectedUploadFile = signal<File | null>(null);
  uploadNotes = '';

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
    this.route.queryParams.subscribe((params) => {
      if (params['tab'] === 'template' || params['tab'] === 'templates') {
        this.activeTab.set('template');
      } else {
        this.activeTab.set('prompts');
      }
    });

    this.loadPrompts();
    this.loadTemplates();
  }

  switchTab(tab: FssPromptsTab): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'template' ? 'template' : null },
      queryParamsHandling: 'merge',
    });
    if (tab === 'template') {
      this.loadTemplates();
    }
  }

  loadPrompts(): void {
    this.isLoadingPrompts.set(true);
    this.fssService.getPrompts().subscribe({
      next: (res) => {
        this.prompts.set(res.prompts || []);
        this.isLoadingPrompts.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se načíst prompt šablony.');
        this.isLoadingPrompts.set(false);
      },
    });
  }

  loadTemplates(): void {
    this.isLoadingTemplates.set(true);
    this.fssService.getTemplates().subscribe({
      next: (res) => {
        this.templates.set(res.templates || []);
        this.activeTemplate.set(res.activeTemplate || null);
        this.isLoadingTemplates.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se načíst šablony DOCX.');
        this.isLoadingTemplates.set(false);
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedUploadFile.set(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.name.endsWith('.docx')) {
        this.selectedUploadFile.set(file);
      } else {
        this.errorMessage.set('Lze nahrát pouze soubory typu .docx');
      }
    }
  }

  uploadTemplate(): void {
    const file = this.selectedUploadFile();
    if (!file) return;

    this.isUploading.set(true);
    this.errorMessage.set(null);

    const formData = new FormData();
    formData.append('file', file);
    if (this.uploadNotes.trim()) {
      formData.append('notes', this.uploadNotes.trim());
    }

    this.fssService.uploadTemplate(formData).subscribe({
      next: (res) => {
        this.successMessage.set(res.message || 'Nová šablona DOCX byla úspěšně nahrána a aktivována.');
        this.selectedUploadFile.set(null);
        this.uploadNotes = '';
        this.isUploading.set(false);
        this.loadTemplates();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při nahrávání šablony.');
        this.isUploading.set(false);
      },
    });
  }

  activateTemplateVersion(id: string): void {
    this.errorMessage.set(null);
    this.fssService.activateTemplate(id).subscribe({
      next: (res) => {
        this.successMessage.set(res.message || 'Šablona byla aktivována.');
        this.loadTemplates();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při aktivaci šablony.');
      },
    });
  }

  deleteTemplateVersion(id: string): void {
    if (!confirm('Opravdu chcete smazat tuto verzi šablony?')) return;

    this.errorMessage.set(null);
    this.fssService.deleteTemplate(id).subscribe({
      next: () => {
        this.successMessage.set('Verze šablony byla smazána.');
        this.loadTemplates();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při mazání šablony.');
      },
    });
  }

  resetToDefaultTemplate(): void {
    if (!confirm('Opravdu chcete zrušit vlastní šablonu a vrátit se k výchozí šabloně?')) return;

    this.isResetting.set(true);
    this.errorMessage.set(null);
    this.fssService.resetToDefaultTemplate().subscribe({
      next: () => {
        this.successMessage.set('Šablona byla resetována na výchozí vestavěnou šablonu PBŘ.');
        this.isResetting.set(false);
        this.loadTemplates();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při resetování šablony.');
        this.isResetting.set(false);
      },
    });
  }

  downloadActiveTemplate(): void {
    this.fssService.downloadTemplate().subscribe({
      next: (blob) => {
        const filename = this.activeTemplate()?.name || 'template.docx';
        this.saveBlobAsFile(blob, filename);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se stáhnout aktivní šablonu.');
      },
    });
  }

  downloadDefaultTemplate(): void {
    this.fssService.downloadDefaultTemplate().subscribe({
      next: (blob) => {
        this.saveBlobAsFile(blob, 'default_template.docx');
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se stáhnout výchozí šablonu.');
      },
    });
  }

  downloadSpecificTemplate(id: string, filename: string): void {
    this.fssService.downloadTemplate(id).subscribe({
      next: (blob) => {
        this.saveBlobAsFile(blob, filename || 'template.docx');
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se stáhnout šablonu.');
      },
    });
  }

  private saveBlobAsFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  isPlaceholderInActiveTemplate(placeholder: string): boolean {
    const clean = placeholder.replace(/[{}]/g, '').trim();
    const active = this.activeTemplate();
    if (!active || !active.placeholders) return true; // Default template contains all
    return active.placeholders.some((p) => p.replace(/[{}]/g, '').trim() === clean);
  }

  copyPlaceholder(placeholder: string): void {
    navigator.clipboard.writeText(placeholder).then(() => {
      this.successMessage.set(`Zástupná značka ${placeholder} zkopírována do schránky.`);
      setTimeout(() => {
        if (this.successMessage()?.includes(placeholder)) {
          this.successMessage.set(null);
        }
      }, 3000);
    });
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
