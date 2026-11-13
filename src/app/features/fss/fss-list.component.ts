import { Component, inject, signal, computed, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRippleModule } from '@angular/material/core';
import { AutoResizeDirective } from '../../core/directives/auto-resize.directive';
import { FssService } from '../../core/services/fss.service';
import { AuthService } from '../../core/services/auth.service';
import {
  FireSafetySolution,
  FireSafetySolutionProperties,
  FssTechnicalDocumentationFile,
  FssPropertyFieldMeta,
  FSS_PROPERTY_FIELDS,
  FssPromptTemplate,
} from '../../core/models/fss.models';

const INITIAL_FORM_DATA: FireSafetySolutionProperties = {
  nazevStavby: '',
  investorName: '',
  mistoStavby: '',
  stupenDokumentace: 'DSP - Dokumentace pro stavební povolení',
  datum: new Date().toISOString().split('T')[0],
  zhodnoceniTechnickychZarizeniStavby: '',
  seznamPriloh: '',
  seznamPodkladu: '',
  uvod: '',
  kategorizaceStavbyZHlediskaPozarniBezpecnosti: '',
  konstrukcniReseniStavby: '',
  posouzeniPozarniBezpecnostiStaveb: '',
  pozarniOdolnostStavebnichKonstrukci: '',
  evakuaceADruhyAKapacityUnikovychCest: '',
  pozarneNebezpecnyProstorOdstupoveVzdalenosti: '',
  zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami: '',
  pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni: '',
  pozadavkyProHaseniPozaruAZachrannePrace: '',
};

@Component({
  selector: 'app-fss-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatRippleModule,
    AutoResizeDirective,
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <mat-icon class="!text-amber-500">local_fire_department</mat-icon>
            <span>Fire Safety Solutions (PBŘ)</span>
          </h1>
          <p class="text-xs sm:text-sm text-zinc-400 mt-1">
            Požárně bezpečnostní řešení staveb, AI generování technických posouzení z projektové dokumentace a export do formátu DOCX.
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
            <span>Nové řešení PBŘ</span>
          </button>
        </div>
      </div>

      <!-- Success & Error Messages -->
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
            placeholder="Hledat v názvu stavby, investorovi, lokalitě..."
            class="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500"
          />
          <mat-icon class="!text-zinc-400 !text-sm !w-4 !h-4 absolute left-3 top-2.5">search</mat-icon>
        </div>

        <div class="text-xs text-zinc-400 flex items-center gap-3">
          <span>Celkem projektů: <strong class="text-zinc-200">{{ filteredSolutions().length }}</strong></span>
        </div>
      </div>

      <!-- Solutions List -->
      @if (isLoading()) {
        <div class="py-16 text-center text-zinc-400 text-sm flex flex-col items-center justify-center gap-3">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Načítání řešení PBŘ...</span>
        </div>
      } @else if (filteredSolutions().length === 0) {
        <div class="py-16 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 text-zinc-400 space-y-3">
          <mat-icon class="!text-4xl !w-10 !h-10 text-amber-500 mx-auto">local_fire_department</mat-icon>
          <p class="text-sm font-medium text-zinc-300">Žádná řešení PBŘ nebyla nalezena</p>
          <p class="text-xs text-zinc-500 max-w-sm mx-auto">Vytvořte své první požárně bezpečnostní řešení a využijte AI pro vyplnění technických částí posouzení.</p>
          <button
            mat-flat-button
            color="primary"
            type="button"
            (click)="openCreateModal()"
            class="!rounded-xl !text-xs !font-semibold"
          >
            <mat-icon class="!text-sm !w-4 !h-4 !mr-1">add</mat-icon>
            Vytvořit první PBŘ
          </button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (s of filteredSolutions(); track s.id) {
            <mat-card class="flex flex-col justify-between !p-5 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 hover:!border-zinc-700 transition-all !shadow-lg space-y-4 group">
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h3 class="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                      {{ s.title || s.nazevStavby || 'Nepojmenované PBŘ' }}
                    </h3>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                  <div
                    class="cursor-pointer hover:bg-zinc-800/50 p-1 -m-1 rounded-lg transition-colors group/files flex flex-col justify-center"
                    (click)="openEditModal(s, 'files')"
                    matTooltip="Spravovat a nahrát podklady k posouzení"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-zinc-500 block text-[10px]">Přílohy</span>
                      <mat-icon class="!text-[12px] !w-3 !h-3 text-zinc-500 group-hover/files:text-sky-400 transition-colors">open_in_new</mat-icon>
                    </div>
                    <span class="text-zinc-200 font-medium group-hover/files:text-sky-300 transition-colors">📁 {{ s.files?.length || 0 }} souborů</span>
                  </div>
                  <div>
                    <span class="text-zinc-500 block text-[10px]">AI Generování</span>
                    <span class="text-zinc-200 font-medium">⚡ {{ s.generationCount || 0 }}x ({{ s.totalTokens || 0 }} tok. • {{ formatCost(s.totalCostUsd) }})</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                <button
                  mat-stroked-button
                  type="button"
                  (click)="exportDocx(s)"
                  [disabled]="isExporting() === s.id"
                  class="!rounded-lg !text-xs !font-medium"
                  matTooltip="Stáhnout jako Microsoft Word dokument (.docx)"
                >
                  @if (isExporting() === s.id) {
                    <span class="flex items-center gap-1.5">
                      <mat-spinner diameter="14"></mat-spinner>
                      <span>Exportuji...</span>
                    </span>
                  } @else {
                    <span class="flex items-center">
                      <mat-icon class="!text-xs !w-3.5 !h-3.5 !mr-1 text-sky-400">description</mat-icon>
                      <span>DOCX</span>
                    </span>
                  }
                </button>

                <div class="flex items-center gap-1">
                  <button
                    mat-icon-button
                    type="button"
                    (click)="openEditModal(s, 'files')"
                    class="!text-zinc-400 hover:!text-sky-400"
                    [matTooltip]="'Nahrát a spravovat soubory (' + (s.files?.length || 0) + ')'"
                  >
                    <mat-icon>attach_file</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    (click)="openEditModal(s)"
                    class="!text-zinc-400 hover:!text-indigo-400"
                    matTooltip="Upravit PBŘ"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    type="button"
                    (click)="deleteSolution(s.id)"
                    class="!text-zinc-500 hover:!text-rose-400"
                    matTooltip="Smazat řešení"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </mat-card>
          }
        </div>
      }

      <!-- Modal: Create / Edit Solution -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/80 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6 animate-in fade-in">
          <mat-card class="relative w-full max-w-5xl !bg-zinc-900 !border !border-zinc-800 !rounded-2xl !shadow-2xl overflow-hidden flex flex-col max-h-[92vh] !p-0">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 text-lg flex items-center justify-center">
                  <mat-icon class="!text-amber-500">local_fire_department</mat-icon>
                </div>
                <div>
                  <h2 class="text-base sm:text-lg font-bold text-white">
                    {{ editingId() ? 'Upravit řešení PBŘ & AI Posouzení' : 'Nové řešení PBŘ' }}
                  </h2>
                  <p class="text-xs text-zinc-400">Vyplňte údaje stavby, přiložte projektové podklady a použijte AI pro technická posouzení.</p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  mat-stroked-button
                  type="button"
                  (click)="activeCategory.set('files')"
                  class="!rounded-xl !text-xs !font-medium"
                  [class]="activeCategory() === 'files' ? '!text-sky-300 !border-sky-500/40 !bg-sky-600/10' : '!text-zinc-300 !border-zinc-700'"
                  matTooltip="Nahrát a spravovat přiložené soubory"
                >
                  <mat-icon class="!text-sm !w-4 !h-4 !mr-1 text-sky-400">attach_file</mat-icon>
                  <span>Přílohy ({{ modalFiles().length }})</span>
                </button>
                <button
                  mat-flat-button
                  type="button"
                  (click)="triggerBatchGeneration()"
                  [disabled]="isGeneratingAi()"
                  class="!rounded-xl !text-xs !font-semibold !bg-indigo-600 hover:!bg-indigo-500 !text-white disabled:!opacity-60 disabled:!bg-indigo-600 disabled:!text-white shadow-md cursor-pointer shrink-0"
                >
                  @if (isGeneratingBatch()) {
                    <span class="flex items-center gap-1.5">
                      <mat-spinner diameter="14"></mat-spinner>
                      <span>Generování všech polí...</span>
                    </span>
                  } @else {
                    <span class="flex items-center">
                      <mat-icon class="!text-sm !w-4 !h-4 !mr-1">auto_awesome</mat-icon>
                      <span>AI Vygenerovat celé PBŘ</span>
                    </span>
                  }
                </button>
                <button
                  type="button"
                  (click)="closeModal()"
                  class="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- AI Generation Progress Bar -->
            @if (isGeneratingAi()) {
              <mat-progress-bar mode="indeterminate" class="!h-1"></mat-progress-bar>
            }

            <!-- Category Tabs -->
            <div class="flex items-center gap-1 px-6 py-2.5 bg-zinc-950/60 border-b border-zinc-800 overflow-x-auto text-xs">
              @for (cat of formCategories; track cat.id) {
                <button
                  matRipple
                  type="button"
                  (click)="setActiveCategory(cat.id)"
                  class="px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all cursor-pointer flex items-center gap-1.5"
                  [class]="activeCategory() === cat.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'"
                >
                  <span>{{ cat.label }}</span>
                  @if (cat.id === 'files' && modalFiles().length > 0) {
                    <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-400/20 text-indigo-200 font-bold">
                      {{ modalFiles().length }}
                    </span>
                  }
                </button>
              }
            </div>

            <!-- Modal Body / Form -->
            <div class="flex-1 overflow-y-auto p-6 space-y-6">
              <!-- Quick Files Notification Banner if not on files tab -->
              @if (activeCategory() !== 'files') {
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-sky-950/20 border border-sky-500/30 text-xs">
                  <div class="flex items-center gap-2.5 text-zinc-300">
                    <div class="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                      <mat-icon class="!text-base !w-4 !h-4">attach_file</mat-icon>
                    </div>
                    <div>
                      <span class="font-medium text-white">Podklady a výkresová dokumentace: </span>
                      <span class="text-zinc-300">{{ modalFiles().length }} souborů přiloženo</span>
                      @if (modalFiles().length === 0) {
                        <span class="text-zinc-400 block text-[11px]">Pro nejpřesnější generování PBŘ nahrajte výkresy, situace nebo technické zprávy.</span>
                      }
                    </div>
                  </div>
                  <button
                    mat-stroked-button
                    type="button"
                    (click)="activeCategory.set('files')"
                    class="!rounded-lg !text-xs !font-medium !text-sky-300 !border-sky-500/30 !bg-sky-600/10 shrink-0"
                  >
                    <mat-icon class="!text-xs !w-3.5 !h-3.5 !mr-1 text-sky-400">upload_file</mat-icon>
                    {{ modalFiles().length === 0 ? 'Nahrát soubory k posouzení' : 'Spravovat / nahrát soubory' }}
                  </button>
                </div>
              }

              <!-- Custom Title -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-zinc-300">Interní název projektu / Zakázky</label>
                  <input
                    type="text"
                    [(ngModel)]="customTitle"
                    placeholder="např. PBŘ - Polyfunkční dům Nová Waltrovka"
                    class="w-full px-3.5 py-2 rounded-xl bg-zinc-800/90 border border-zinc-700/80 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <!-- Form Fields based on Active Category -->
              @if (activeCategory() === 'files') {
                <!-- File Attachments Tab -->
                <div class="space-y-4">
                  <div class="p-6 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950/40 text-center space-y-3">
                    <mat-icon class="!text-4xl !w-10 !h-10 text-indigo-400 mx-auto">folder_open</mat-icon>
                    <div>
                      <p class="text-xs font-semibold text-zinc-200">Nahrajte technickou dokumentaci k posouzení</p>
                      <p class="text-[11px] text-zinc-400 mt-0.5">Podporované formáty: PDF, DWG, DXF, DOCX, PNG, JPG situací stavby</p>
                    </div>
                    <input
                      #fileInput
                      type="file"
                      multiple
                      (change)="handleFileUpload($event)"
                      class="hidden"
                    />
                    <button
                      mat-flat-button
                      color="primary"
                      type="button"
                      (click)="fileInput.click()"
                      [disabled]="isUploadingFiles()"
                      class="!rounded-xl !text-xs !font-medium"
                    >
                      <mat-icon class="!text-sm !w-4 !h-4 !mr-1">attach_file</mat-icon>
                      <span>{{ isUploadingFiles() ? 'Nahrávání...' : 'Vybrat soubory k nahrání' }}</span>
                    </button>
                  </div>

                  <!-- Uploaded Files List -->
                  @if (modalFiles().length > 0) {
                    <div class="space-y-2">
                      <h4 class="text-xs font-semibold text-zinc-300">Přiložené technické soubory ({{ modalFiles().length }})</h4>
                      <div class="divide-y divide-zinc-800/80 border border-zinc-800 rounded-xl bg-zinc-950/40 overflow-hidden">
                        @for (file of modalFiles(); track file.id) {
                          <div class="flex items-center justify-between p-3 text-xs">
                            <div class="flex items-center gap-2.5 min-w-0">
                              <span class="text-base">{{ getFileIcon(file.name) }}</span>
                              <div class="truncate">
                                <p class="text-zinc-200 font-medium truncate">{{ file.name }}</p>
                                <p class="text-[10px] text-zinc-500">{{ formatBytes(file.size) }} • {{ file.uploadedAt | date:'short' }}</p>
                              </div>
                            </div>
                            <div class="flex items-center gap-1">
                              <button
                                mat-icon-button
                                type="button"
                                (click)="downloadFile(file)"
                                class="!text-zinc-400 hover:!text-white"
                                matTooltip="Stáhnout soubor"
                              >
                                <mat-icon>download</mat-icon>
                              </button>
                              <button
                                mat-icon-button
                                type="button"
                                (click)="removeFile(file.id)"
                                class="!text-zinc-500 hover:!text-rose-400"
                                matTooltip="Odstranit soubor"
                              >
                                <mat-icon>delete</mat-icon>
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <!-- Property Fields -->
                <div class="space-y-4">
                  @for (field of visibleFields(); track field.key) {
                    <div class="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/80 space-y-2 hover:border-zinc-700/80 transition-colors relative overflow-hidden">
                      @if (generatingField() === field.key || isGeneratingBatch()) {
                        <mat-progress-bar mode="indeterminate" class="!h-1 -mt-4 -mx-4 mb-2"></mat-progress-bar>
                      }

                      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <label class="block text-xs font-semibold text-zinc-200">
                            {{ field.label }}
                          </label>
                          <span class="text-[10px] font-mono text-indigo-400">{{ field.placeholder }}</span>
                        </div>

                        <div class="flex items-center gap-2">
                          <button
                            mat-stroked-button
                            type="button"
                            (click)="previewPromptForField(field.key)"
                            class="!rounded-lg !text-[11px] !font-medium"
                            matTooltip="Zobrazit prompt šablonu"
                          >
                            <mat-icon class="!text-xs !w-3.5 !h-3.5 !mr-1">search</mat-icon>
                            Prompt
                          </button>

                          <button
                            mat-stroked-button
                            type="button"
                            (click)="generateFieldWithAi(field.key)"
                            [disabled]="isGeneratingAi()"
                            class="!rounded-lg !text-[11px] !font-medium !text-indigo-300 !border-indigo-500/30 !bg-indigo-600/10 disabled:!opacity-60"
                            matTooltip="Vygenerovat obsah pole pomocí AI"
                          >
                            @if (generatingField() === field.key) {
                              <span class="flex items-center gap-1.5">
                                <mat-spinner diameter="12"></mat-spinner>
                                <span>Generuji...</span>
                              </span>
                            } @else {
                              <span class="flex items-center">
                                <mat-icon class="!text-xs !w-3.5 !h-3.5 !mr-1 text-amber-400">bolt</mat-icon>
                                <span>AI Vygenerovat</span>
                              </span>
                            }
                          </button>
                        </div>
                      </div>

                      @if (field.description) {
                        <p class="text-[11px] text-zinc-400">{{ field.description }}</p>
                      }

                      @if (field.type === 'textarea') {
                        <textarea
                          autoResize
                          [autoResize]="formData[field.key]"
                          rows="4"
                          [(ngModel)]="formData[field.key]"
                          [placeholder]="'Zadejte ' + field.label.toLowerCase() + '...'"
                          class="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed resize-none overflow-hidden"
                        ></textarea>
                      } @else if (field.type === 'date') {
                        <input
                          type="date"
                          [(ngModel)]="formData[field.key]"
                          class="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      } @else {
                        <input
                          type="text"
                          [(ngModel)]="formData[field.key]"
                          [placeholder]="'Zadejte ' + field.label.toLowerCase() + '...'"
                          class="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                        />
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-4 border-t border-zinc-800 bg-zinc-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <button
                  mat-button
                  type="button"
                  (click)="closeModal()"
                  class="!rounded-xl !text-zinc-300 !text-xs"
                >
                  Zrušit
                </button>
                <button
                  mat-stroked-button
                  type="button"
                  (click)="exportCurrentDocx()"
                  class="!rounded-xl !text-xs !font-medium"
                >
                  <mat-icon class="!text-xs !w-3.5 !h-3.5 !mr-1 text-sky-400">description</mat-icon>
                  Exportovat DOCX
                </button>
              </div>

              <div class="flex items-center gap-3">
                <button
                  mat-flat-button
                  type="button"
                  (click)="saveSolution()"
                  [disabled]="isSaving() || isGeneratingAi()"
                  class="!rounded-xl !text-xs !font-semibold !bg-indigo-600 hover:!bg-indigo-500 !text-white disabled:!opacity-60 disabled:!bg-indigo-600 disabled:!text-white shadow-md cursor-pointer"
                >
                  @if (isSaving()) {
                    <span class="flex items-center gap-1.5">
                      <mat-spinner diameter="14"></mat-spinner>
                      <span>Ukládání...</span>
                    </span>
                  } @else {
                    <span class="flex items-center">
                      <mat-icon class="!text-sm !w-4 !h-4 !mr-1">save</mat-icon>
                      <span>{{ editingId() ? 'Uložit změny' : 'Vytvořit řešení PBŘ' }}</span>
                    </span>
                  }
                </button>
              </div>
            </div>
          </mat-card>
        </div>
      }

      <!-- Prompt Preview Modal -->
      @if (inspectingPrompt(); as p) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/80 backdrop-blur-sm flex justify-center p-3 sm:p-6 animate-in fade-in">
          <mat-card class="relative w-full max-w-2xl !bg-zinc-900 !border !border-zinc-800 !rounded-2xl !shadow-2xl !p-6 space-y-4">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                  <mat-icon class="!text-indigo-400">square_foot</mat-icon>
                  <span>Prompt šablona:</span>
                  <span class="text-indigo-400 font-mono">{{ p.propertyName || p.fieldKey }}</span>
                </h3>
                <p class="text-xs text-zinc-400">{{ p.placeholderKey }} • {{ p.category }}</p>
              </div>
              <button
                type="button"
                (click)="inspectingPrompt.set(null)"
                class="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div class="space-y-3 text-xs">
              <div class="space-y-1">
                <span class="text-zinc-400 font-semibold block">Systémový prompt:</span>
                <div class="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 whitespace-pre-wrap">
                  {{ p.systemPrompt }}
                </div>
              </div>

              <div class="space-y-1">
                <span class="text-zinc-400 font-semibold block">Uživatelský prompt:</span>
                <div class="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 whitespace-pre-wrap">
                  {{ p.userPrompt }}
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-2">
                <div>Zahrnout soubory: <strong class="text-zinc-200">{{ p.includeFiles ? 'Ano' : 'Ne' }}</strong></div>
                <div>Teplota modelu: <strong class="text-zinc-200">{{ p.temperature ?? 0.2 }}</strong></div>
              </div>
            </div>

            <div class="flex justify-end pt-3 border-t border-zinc-800">
              <button
                mat-stroked-button
                type="button"
                (click)="inspectingPrompt.set(null)"
                class="!rounded-xl !text-xs"
              >
                Zavřít
              </button>
            </div>
          </mat-card>
        </div>
      }
    </div>
  `,
})
export class FssListComponent implements OnInit {
  private fssService = inject(FssService);
  private authService = inject(AuthService);

  readonly solutions = signal<FireSafetySolution[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly searchQuery = signal<string>('');

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly editingId = signal<string | null>(null);
  readonly isSaving = signal<boolean>(false);
  readonly isExporting = signal<string | null>(null);
  readonly generatingField = signal<string | null>(null);
  readonly isGeneratingBatch = signal<boolean>(false);
  readonly isGeneratingAi = computed(() => this.isGeneratingBatch() || !!this.generatingField());
  readonly isUploadingFiles = signal<boolean>(false);

  readonly activeCategory = signal<string>('all');
  readonly modalFiles = signal<FssTechnicalDocumentationFile[]>([]);
  readonly inspectingPrompt = signal<FssPromptTemplate | null>(null);

  customTitle: string = '';
  formData: FireSafetySolutionProperties = { ...INITIAL_FORM_DATA };

  readonly formCategories = [
    { id: 'all', label: 'Všechna pole (18)' },
    { id: 'identification', label: '1. Identifikace & Údaje' },
    { id: 'documents', label: '2. Podklady & Úvod' },
    { id: 'assessment', label: '3. Posouzení PBŘ' },
    { id: 'evacuation', label: '4. Únikové cesty & Odstupy' },
    { id: 'extinguishing', label: '5. Zabezpečení & Hašení' },
    { id: 'files', label: '📁 Přílohy dokumentace' },
  ];

  readonly filteredSolutions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.solutions();

    return this.solutions().filter(
      (s) =>
        (s.title && s.title.toLowerCase().includes(query)) ||
        (s.nazevStavby && s.nazevStavby.toLowerCase().includes(query)) ||
        (s.investorName && s.investorName.toLowerCase().includes(query)) ||
        (s.mistoStavby && s.mistoStavby.toLowerCase().includes(query))
    );
  });

  readonly visibleFields = computed<FssPropertyFieldMeta[]>(() => {
    const cat = this.activeCategory();
    if (cat === 'all') return FSS_PROPERTY_FIELDS;
    return FSS_PROPERTY_FIELDS.filter((f) => f.category === cat);
  });

  ngOnInit(): void {
    this.loadSolutions();
  }

  loadSolutions(): void {
    this.isLoading.set(true);
    this.fssService.getSolutions().subscribe({
      next: (res) => {
        this.solutions.set(res.solutions || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se načíst řešení PBŘ.');
        this.isLoading.set(false);
      },
    });
  }

  setActiveCategory(catId: string): void {
    this.activeCategory.set(catId);
    this.adjustAllTextareas();
  }

  adjustAllTextareas(): void {
    setTimeout(() => {
      if (typeof document !== 'undefined') {
        const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea');
        textareas.forEach((ta) => {
          ta.style.height = 'auto';
          ta.style.overflowY = 'hidden';
          if (ta.scrollHeight > 0) {
            ta.style.height = `${ta.scrollHeight}px`;
          }
        });
      }
    }, 0);
  }

  openCreateModal(initialCategory: string = 'all'): void {
    this.editingId.set(null);
    this.customTitle = '';
    this.formData = { ...INITIAL_FORM_DATA, datum: new Date().toISOString().split('T')[0] };
    this.modalFiles.set([]);
    this.activeCategory.set(initialCategory);
    this.isModalOpen.set(true);
    this.adjustAllTextareas();
  }

  openEditModal(solution: FireSafetySolution, initialCategory: string = 'all'): void {
    this.editingId.set(solution.id);
    this.customTitle = solution.title || solution.nazevStavby || '';
    this.formData = {
      nazevStavby: solution.nazevStavby || '',
      investorName: solution.investorName || '',
      mistoStavby: solution.mistoStavby || '',
      stupenDokumentace: solution.stupenDokumentace || 'DSP',
      datum: solution.datum || '',
      zhodnoceniTechnickychZarizeniStavby: solution.zhodnoceniTechnickychZarizeniStavby || '',
      seznamPriloh: solution.seznamPriloh || '',
      seznamPodkladu: solution.seznamPodkladu || '',
      uvod: solution.uvod || '',
      kategorizaceStavbyZHlediskaPozarniBezpecnosti: solution.kategorizaceStavbyZHlediskaPozarniBezpecnosti || '',
      konstrukcniReseniStavby: solution.konstrukcniReseniStavby || '',
      posouzeniPozarniBezpecnostiStaveb: solution.posouzeniPozarniBezpecnostiStaveb || '',
      pozarniOdolnostStavebnichKonstrukci: solution.pozarniOdolnostStavebnichKonstrukci || '',
      evakuaceADruhyAKapacityUnikovychCest: solution.evakuaceADruhyAKapacityUnikovychCest || '',
      pozarneNebezpecnyProstorOdstupoveVzdalenosti: solution.pozarneNebezpecnyProstorOdstupoveVzdalenosti || '',
      zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami: solution.zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami || '',
      pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni: solution.pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni || '',
      pozadavkyProHaseniPozaruAZachrannePrace: solution.pozadavkyProHaseniPozaruAZachrannePrace || '',
    };
    this.modalFiles.set(solution.files || []);
    this.activeCategory.set(initialCategory);
    this.isModalOpen.set(true);
    this.adjustAllTextareas();
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingId.set(null);
  }

  saveSolution(): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload = {
      ...this.formData,
      title: this.customTitle || this.formData.nazevStavby || 'PBŘ Řešení',
      files: this.modalFiles(),
    };

    const id = this.editingId();
    if (id) {
      this.fssService.updateSolution(id, payload).subscribe({
        next: () => {
          this.successMessage.set('Řešení PBŘ bylo úspěšně aktualizováno.');
          this.isSaving.set(false);
          this.closeModal();
          this.loadSolutions();
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Chyba při ukládání PBŘ.');
          this.isSaving.set(false);
        },
      });
    } else {
      this.fssService.createSolution(payload).subscribe({
        next: () => {
          this.successMessage.set('Nové řešení PBŘ bylo úspěšně vytvořeno.');
          this.isSaving.set(false);
          this.closeModal();
          this.loadSolutions();
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Chyba při vytváření PBŘ.');
          this.isSaving.set(false);
        },
      });
    }
  }

  deleteSolution(id: string): void {
    if (!confirm('Opravdu chcete toto řešení PBŘ smazat?')) return;
    this.fssService.deleteSolution(id).subscribe({
      next: () => {
        this.successMessage.set('Řešení PBŘ bylo smazáno.');
        this.solutions.update((list) => list.filter((s) => s.id !== id));
        this.loadSolutions();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při mazání PBŘ.');
      },
    });
  }

  previewPromptForField(fieldKey: string): void {
    this.fssService.getPrompt(fieldKey).subscribe({
      next: (res) => {
        if (res.prompt) {
          this.inspectingPrompt.set(res.prompt);
        }
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se načíst prompt.');
      },
    });
  }

  generateFieldWithAi(fieldKey: keyof FireSafetySolutionProperties): void {
    this.generatingField.set(fieldKey);
    this.errorMessage.set(null);

    this.fssService
      .generateField(fieldKey, {
        fssId: this.editingId() || undefined,
        properties: this.formData,
        files: this.modalFiles(),
      })
      .subscribe({
        next: (res) => {
          const generatedVal = res.value || res.result?.value || res.generatedText;
          if (res.success && generatedVal) {
            this.formData[fieldKey] = generatedVal;
            const tokenStr = res.tokens || res.totalTokens ? ` (${res.tokens || res.totalTokens} tokenů)` : '';
            this.successMessage.set(`Pole '${fieldKey}' bylo úspěšně vygenerováno pomocí AI${tokenStr}.`);
            if (this.editingId()) {
              this.loadSolutions();
            }
            this.adjustAllTextareas();
          } else if (res.error) {
            this.errorMessage.set(res.error);
          }
          this.generatingField.set(null);
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Chyba při generování AI pole.');
          this.generatingField.set(null);
        },
      });
  }

  triggerBatchGeneration(): void {
    this.isGeneratingBatch.set(true);
    this.errorMessage.set(null);

    const allFields = FSS_PROPERTY_FIELDS.map((f) => f.key);

    this.fssService
      .generateBatch({
        fieldKeys: allFields,
        fssId: this.editingId() || undefined,
        properties: this.formData,
        files: this.modalFiles(),
      })
      .subscribe({
        next: (res) => {
          if (res.success && res.results) {
            for (const [key, val] of Object.entries(res.results)) {
              const propKey = key as keyof FireSafetySolutionProperties;
              const generatedText = typeof val === 'string' ? val : val?.value;
              if (generatedText) {
                this.formData[propKey] = generatedText;
              }
            }
            const tokenStr = res.totalTokens || res.tokens ? ` (${res.totalTokens || res.tokens} tokenů)` : '';
            this.successMessage.set(`Všechna pole PBŘ byla vygenerována přes AI${tokenStr}.`);
            if (this.editingId()) {
              this.loadSolutions();
            }
            this.adjustAllTextareas();
          } else if (res.errors) {
            this.errorMessage.set('Některá pole se nepodařilo vygenerovat.');
          }
          this.isGeneratingBatch.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Chyba při hromadném generování PBŘ.');
          this.isGeneratingBatch.set(false);
        },
      });
  }

  handleFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.isUploadingFiles.set(true);
    this.errorMessage.set(null);

    const formData = new FormData();
    for (let i = 0; i < input.files.length; i++) {
      formData.append('files', input.files[i]);
    }

    this.fssService.uploadFiles(this.editingId() || undefined, formData).subscribe({
      next: (res) => {
        if (res.success && res.files) {
          this.modalFiles.set([...this.modalFiles(), ...res.files]);
          this.successMessage.set(`${res.files.length} souborů bylo nahráno k posouzení.`);
        }
        this.isUploadingFiles.set(false);
        input.value = '';
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při nahrávání souborů.');
        this.isUploadingFiles.set(false);
        input.value = '';
      },
    });
  }

  removeFile(fileId: string): void {
    const id = this.editingId();
    if (id) {
      this.fssService.deleteFile(id, fileId).subscribe({
        next: () => {
          this.modalFiles.set(this.modalFiles().filter((f) => f.id !== fileId));
          this.successMessage.set('Soubor byl odstraněn.');
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Chyba při mazání souboru.');
        },
      });
    } else {
      this.modalFiles.set(this.modalFiles().filter((f) => f.id !== fileId));
    }
  }

  downloadFile(file: FssTechnicalDocumentationFile): void {
    this.fssService.downloadFile(this.editingId() || undefined, file.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se stáhnout soubor.');
      },
    });
  }

  exportDocx(solution: FireSafetySolution): void {
    this.isExporting.set(solution.id);
    this.fssService.exportDocx(solution.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `${solution.title || solution.nazevStavby || 'PBR'}.docx`.replace(/\s+/g, '_');
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isExporting.set(null);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při exportu do DOCX.');
        this.isExporting.set(null);
      },
    });
  }

  exportCurrentDocx(): void {
    const id = this.editingId();
    if (id) {
      this.exportDocx({ ...this.formData, id, title: this.customTitle, userId: '', createdAt: '', updatedAt: '' });
    } else {
      this.fssService.exportDraftDocx({ ...this.formData, title: this.customTitle }).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const filename = `${this.customTitle || this.formData.nazevStavby || 'PBR_navrh'}_posouzeni.docx`.replace(/\s+/g, '_');
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Chyba při exportu DOCX.');
        },
      });
    }
  }

  formatCost(cost?: number): string {
    if (!cost || cost === 0) return '$0.00';
    if (cost < 0.01) {
      return `$${cost.toFixed(4)}`;
    }
    return `$${cost.toFixed(2)}`;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📕';
      case 'dwg':
      case 'dxf': return '📐';
      case 'doc':
      case 'docx': return '📘';
      case 'png':
      case 'jpg':
      case 'jpeg': return '🖼️';
      default: return '📄';
    }
  }
}
