import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { AiSettingsService } from '../../core/services/ai-settings.service';
import {
  UserOpenAiConfigStatus,
  UserOpenAiSettingsInput,
  POPULAR_OPENAI_MODELS,
  ALL_KNOWN_OPENAI_MODELS,
  KNOWN_OPENAI_MODEL_DETAILS,
} from '../../core/models/openai.models';

export interface ModelItem {
  id: string;
  name: string;
  category: 'flagship' | 'reasoning' | 'fast' | 'preview' | 'legacy';
  categoryLabel: string;
  description: string;
  context: string;
  isReasoning?: boolean;
  isRecommended?: boolean;
}

export const ALL_OPENAI_MODELS: ModelItem[] = [
  // GPT-6 Generation
  {
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra',
    category: 'flagship',
    categoryLabel: 'GPT-6 Vlajkový',
    description: 'Špičkový vlajkový model nové generace GPT-6 s 1.05M kontextem pro náročné inženýrské výpočty a PBŘ posouzení.',
    context: '1.05M',
    isReasoning: true,
    isRecommended: true,
  },
  {
    id: 'gpt-6.1-sol',
    name: 'GPT-6.1 Sol',
    category: 'flagship',
    categoryLabel: 'GPT-6 Vyvážený',
    description: 'Výkonný a vyvážený model řady GPT-6 s 1.05M kontextem pro každodenní technické zprávy.',
    context: '1.05M',
    isRecommended: true,
  },
  {
    id: 'gpt-6-sol',
    name: 'GPT-6 Sol',
    category: 'flagship',
    categoryLabel: 'GPT-6 Vyvážený',
    description: 'Stabilní pracovní model řady GPT-6 s 1.05M kontextovým oknem.',
    context: '1.05M',
  },
  {
    id: 'gpt-6-luna',
    name: 'GPT-6 Luna',
    category: 'fast',
    categoryLabel: 'GPT-6 Rychlý & Úsporný',
    description: 'Bleskurychlý a cenově nejefektivnější model generace GPT-6 s 1.05M kontextem pro hromadné operace.',
    context: '1.05M',
    isRecommended: true,
  },
  {
    id: 'gpt-6-instant',
    name: 'GPT-6 Instant',
    category: 'fast',
    categoryLabel: 'GPT-6 Interaktivní',
    description: 'Interaktivní model optimalizovaný pro nízkou latenci a okamžité dynamické generování.',
    context: '1.05M',
  },
  {
    id: 'gpt-6-cyber',
    name: 'GPT-6 Cyber',
    category: 'reasoning',
    categoryLabel: 'GPT-6 Bezpečnostní',
    description: 'Specializovaný model pro hloubkovou analýzu bezpečnostních standardů a zranitelností.',
    context: '1.05M',
    isReasoning: true,
  },

  // Flagship & Universal
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    category: 'flagship',
    categoryLabel: 'Vlajkové modely',
    description: 'Vlajkový multimodální model s vysokou inteligencí, rychlostí a přesností pro náročná PBŘ posouzení.',
    context: '128k',
    isRecommended: true,
  },
  {
    id: 'chatgpt-4o-latest',
    name: 'ChatGPT-4o Latest',
    category: 'flagship',
    categoryLabel: 'Vlajkové modely',
    description: 'Průběžně aktualizovaná verze modelu GPT-4o používaná v ChatGPT rozhraní.',
    context: '128k',
  },
  {
    id: 'gpt-4.5-preview',
    name: 'GPT-4.5 Preview',
    category: 'flagship',
    categoryLabel: 'Vlajkové modely',
    description: 'Největší model nové generace s hlubokou znalostní bází a porozuměním nuancím.',
    context: '128k',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    category: 'flagship',
    categoryLabel: 'Vlajkové modely',
    description: 'Osvědčený předchozí vlajkový model s podporou vidění a rozsáhlého kontextu.',
    context: '128k',
  },
  {
    id: 'gpt-4o-2024-11-20',
    name: 'GPT-4o (2024-11-20)',
    category: 'flagship',
    categoryLabel: 'Vlajkové modely',
    description: 'Nejnovější snapshot modelu GPT-4o s vylepšeným formátováním a kreativitou.',
    context: '128k',
  },
  {
    id: 'gpt-4o-2024-08-06',
    name: 'GPT-4o (2024-08-06)',
    category: 'flagship',
    categoryLabel: 'Vlajkové modely',
    description: 'Snapshot s podporou Structured Outputs pro přesné JSON schéma.',
    context: '128k',
  },
  {
    id: 'gpt-4o-2024-05-13',
    name: 'GPT-4o (2024-05-13)',
    category: 'flagship',
    categoryLabel: 'Vlajkové modely',
    description: 'Původní stabilní snapshot modelu GPT-4o Omni.',
    context: '128k',
  },

  // Fast & Lightweight
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    category: 'fast',
    categoryLabel: 'Rychlé & Úsporné',
    description: 'Extrémně rychlý a cenově nejefektivnější model pro standardní textové formulace PBŘ.',
    context: '128k',
    isRecommended: true,
  },
  {
    id: 'gpt-4o-mini-2024-07-18',
    name: 'GPT-4o Mini (2024-07-18)',
    category: 'fast',
    categoryLabel: 'Rychlé & Úsporné',
    description: 'Stabilní snapshot modelu GPT-4o Mini.',
    context: '128k',
  },

  // Reasoning Models
  {
    id: 'o3-mini',
    name: 'o3-mini',
    category: 'reasoning',
    categoryLabel: 'Reasoning (Uvažování)',
    description: 'Nejnovější rychlý reasoning model pro přesnou kontrolu norem ČSN, STEM a technické výpočty.',
    context: '200k',
    isReasoning: true,
    isRecommended: true,
  },
  {
    id: 'o1',
    name: 'o1',
    category: 'reasoning',
    categoryLabel: 'Reasoning (Uvažování)',
    description: 'Plnohodnotný uvažovací model s maximální logickou přesností pro komplexní inženýrská posouzení.',
    context: '200k',
    isReasoning: true,
    isRecommended: true,
  },
  {
    id: 'o4-mini',
    name: 'o4-mini',
    category: 'reasoning',
    categoryLabel: 'Reasoning (Uvažování)',
    description: 'Next-gen reasoning model pro bleskovou technickou verifikaci a normové posudky.',
    context: '128k',
    isReasoning: true,
  },
  {
    id: 'o1-mini',
    name: 'o1-mini',
    category: 'reasoning',
    categoryLabel: 'Reasoning (Uvažování)',
    description: 'Kompaktní uvažovací model zaměřený na strukturované technické úlohy.',
    context: '128k',
    isReasoning: true,
  },
  {
    id: 'o1-preview',
    name: 'o1 Preview',
    category: 'reasoning',
    categoryLabel: 'Reasoning (Uvažování)',
    description: 'Preview verze pokročilého uvažovacího modelu pro hluboké řetězce myšlenek.',
    context: '128k',
    isReasoning: true,
  },
  {
    id: 'o3-mini-2025-01-31',
    name: 'o3-mini (2025-01-31)',
    category: 'reasoning',
    categoryLabel: 'Reasoning (Uvažování)',
    description: 'Snapshot verze o3-mini s plnou podporou parametru reasoning_effort.',
    context: '200k',
    isReasoning: true,
  },
  {
    id: 'o1-2024-12-17',
    name: 'o1 (2024-12-17)',
    category: 'reasoning',
    categoryLabel: 'Reasoning (Uvažování)',
    description: 'Původní snapshot plného modelu o1.',
    context: '200k',
    isReasoning: true,
  },

  // Legacy & Previews
  {
    id: 'gpt-4.5-preview-2025-02-27',
    name: 'GPT-4.5 Preview (2025-02-27)',
    category: 'legacy',
    categoryLabel: 'Předchozí & Snapshoty',
    description: 'Snapshot největšího modelu GPT-4.5 s rozsáhlou znalostní bází.',
    context: '128k',
  },
  {
    id: 'gpt-4-turbo-2024-04-09',
    name: 'GPT-4 Turbo (2024-04-09)',
    category: 'legacy',
    categoryLabel: 'Předchozí & Snapshoty',
    description: 'Snapshot GPT-4 Turbo s Vision a 128k oknem.',
    context: '128k',
  },
  {
    id: 'gpt-4-turbo-preview',
    name: 'GPT-4 Turbo Preview',
    category: 'legacy',
    categoryLabel: 'Předchozí & Snapshoty',
    description: 'Předchozí preview verze GPT-4 Turbo.',
    context: '128k',
  },
  {
    id: 'gpt-4-0125-preview',
    name: 'GPT-4 Turbo (0125 Preview)',
    category: 'legacy',
    categoryLabel: 'Předchozí & Snapshoty',
    description: 'Starší verze GPT-4 Turbo s vylepšeným generováním kódu a textu.',
    context: '128k',
  },
  {
    id: 'gpt-4-1106-preview',
    name: 'GPT-4 Turbo (1106 Preview)',
    category: 'legacy',
    categoryLabel: 'Předchozí & Snapshoty',
    description: 'Původní GPT-4 Turbo 128k preview.',
    context: '128k',
  },
  {
    id: 'gpt-4',
    name: 'GPT-4 (Base)',
    category: 'legacy',
    categoryLabel: 'Předchozí & Snapshoty',
    description: 'Původní model GPT-4 pro komplexní úlohy.',
    context: '8k',
  },
  {
    id: 'gpt-4-0613',
    name: 'GPT-4 (0613)',
    category: 'legacy',
    categoryLabel: 'Předchozí & Snapshoty',
    description: 'Snapshot GPT-4 s podporou function calling.',
    context: '8k',
  },
  {
    id: 'gpt-4-32k',
    name: 'GPT-4 (32k)',
    category: 'legacy',
    categoryLabel: 'Předchozí & Snapshoty',
    description: 'Rozšířená 32k kontextová verze původního GPT-4.',
    context: '32k',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    category: 'legacy',
    categoryLabel: 'Předchozí & Snapshoty',
    description: 'Starší základní model pro nenáročné textové úpravy.',
    context: '16k',
  },
  {
    id: 'gpt-3.5-turbo-0125',
    name: 'GPT-3.5 Turbo (0125)',
    category: 'legacy',
    categoryLabel: 'Předchozí & Snapshoty',
    description: 'Nejnovější snapshot řady GPT-3.5.',
    context: '16k',
  },
  {
    id: 'gpt-3.5-turbo-1106',
    name: 'GPT-3.5 Turbo (1106)',
    category: 'legacy',
    categoryLabel: 'Předchozí & Snapshoty',
    description: 'Snapshot GPT-3.5 s podporou JSON módu.',
    context: '16k',
  },
  {
    id: 'gpt-3.5-turbo-instruct',
    name: 'GPT-3.5 Turbo Instruct',
    category: 'legacy',
    categoryLabel: 'Předchozí & Snapshoty',
    description: 'Model přímého instruování pro specifické formátování.',
    context: '4k',
  },
];

@Component({
  selector: 'app-user-ai-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatRippleModule,
  ],
  template: `
    <div class="space-y-6 max-w-5xl">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <mat-icon class="!text-amber-400">bolt</mat-icon>
            <span>Osobní AI Nastavení</span>
          </h1>
          <p class="text-xs sm:text-sm text-zinc-400 mt-1">
            Konfigurace vlastního OpenAI API klíče, parametrů modelů a uvažování pro generování PBŘ řešení.
          </p>
        </div>

        @if (config()?.apiKeyConfigured) {
          <button
            mat-stroked-button
            color="warn"
            type="button"
            (click)="clearApiKey()"
            [disabled]="isSaving()"
            class="!rounded-xl !text-xs"
          >
            <mat-icon class="!text-sm !w-4 !h-4 !mr-1">delete</mat-icon>
            Odstranit vlastní klíč
          </button>
        }
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

      @if (isLoading()) {
        <div class="py-16 text-center text-zinc-400 text-sm flex flex-col items-center justify-center gap-3">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Načítání konfigurace AI...</span>
        </div>
      } @else {
        <div class="space-y-6">
          <!-- Status Banner -->
          <mat-card class="!p-5 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-center gap-3.5">
                <div class="p-3 rounded-xl text-xl flex items-center justify-center" [class]="config()?.apiKeyConfigured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'">
                  <mat-icon>{{ config()?.apiKeyConfigured ? 'key' : 'cloud' }}</mat-icon>
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-white">
                    {{ config()?.apiKeyConfigured ? 'Aktivní osobní OpenAI klíč' : 'Výchozí systémový klíč' }}
                  </h3>
                  <p class="text-xs text-zinc-400 mt-0.5">
                    {{ config()?.apiKeyConfigured ? ('Klíč: ' + (config()?.maskedKey || 'sk-...')) : 'Využíváte centrální serverový OpenAI klíč projektu.' }}
                  </p>
                </div>
              </div>

              <!-- Top Status Active Model Badge -->
              <div class="flex items-center gap-2">
                <div class="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs flex items-center gap-2">
                  <mat-icon class="!text-sm !w-4 !h-4 text-indigo-400">{{ selectedModelInfo().isReasoning ? 'psychology' : 'smart_toy' }}</mat-icon>
                  <span class="text-zinc-400">Aktivní model:</span>
                  <span class="font-bold text-white">{{ selectedModelInfo().name }}</span>
                  <code class="px-1.5 py-0.5 rounded bg-zinc-900 text-indigo-400 font-mono text-[10px] border border-zinc-800">{{ selectedModel }}</code>
                </div>
              </div>
            </div>
          </mat-card>

          <!-- API Key Form Card -->
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg space-y-4">
            <div>
              <h2 class="text-sm font-semibold text-white flex items-center gap-1.5">
                <mat-icon class="!text-sm !w-4 !h-4 text-indigo-400">vpn_key</mat-icon>
                <span>Zadání OpenAI API Klíče</span>
              </h2>
              <p class="text-xs text-zinc-400 mt-0.5">Zadejte svůj osobní OpenAI token pro přímé účtování na váš OpenAI účet.</p>
            </div>

            <div class="space-y-2">
              <div class="flex flex-col sm:flex-row gap-2">
                <div class="relative flex-1">
                  <input
                    [type]="showKey ? 'text' : 'password'"
                    [(ngModel)]="apiKeyInput"
                    placeholder="sk-proj-..."
                    class="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    (click)="showKey = !showKey"
                    class="absolute right-3 top-2.5 text-zinc-400 hover:text-white text-xs cursor-pointer"
                  >
                    <mat-icon class="!text-sm !w-4 !h-4">{{ showKey ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </div>

                <button
                  mat-stroked-button
                  type="button"
                  (click)="testApiKey()"
                  [disabled]="isValidating() || !apiKeyInput"
                  class="!rounded-xl !text-xs !font-semibold"
                >
                  <mat-icon class="!text-sm !w-4 !h-4 !mr-1">search</mat-icon>
                  {{ isValidating() ? 'Ověřuji...' : 'Otestovat klíč' }}
                </button>
              </div>
            </div>

            <!-- Test Validation Result -->
            @if (validationStatus()) {
              <div
                class="p-3.5 rounded-xl text-xs space-y-1.5 animate-in fade-in"
                [class]="validationStatus()?.success ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300' : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'"
              >
                <div class="font-semibold flex items-center justify-between">
                  <span>{{ validationStatus()?.success ? '✓ Klíč je platný a komunikace s OpenAI proběhla úspěšně' : '✕ Ověření klíče selhalo' }}</span>
                  @if (validationLatencyMs > 0) {
                    <span class="text-[11px] opacity-80">{{ validationLatencyMs }} ms</span>
                  }
                </div>
                @if (validationStatus()?.completion) {
                  <p class="text-[11px] text-zinc-400 italic">"{{ validationStatus()?.completion }}"</p>
                }
                @if (validationStatus()?.error) {
                  <p class="text-[11px] text-rose-400 font-mono">{{ validationStatus()?.error }}</p>
                }
              </div>
            }
          </mat-card>

          <!-- Model Selection Card -->
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 class="text-sm font-semibold text-white flex items-center gap-1.5">
                  <mat-icon class="!text-sm !w-4 !h-4 text-indigo-400">smart_toy</mat-icon>
                  <span>Výběr Preferovaného Modelu</span>
                </h2>
                <p class="text-xs text-zinc-400 mt-0.5">Zvolte výchozí AI model, který se použije pro generování PBŘ posouzení a technických výpočtů.</p>
              </div>

              <!-- Live API Status & Dynamic Refresh Button -->
              <div class="flex items-center gap-2">
                <span
                  class="px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border"
                  [class]="modelSource() === 'openai-api' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-zinc-800/80 text-zinc-400 border-zinc-700'"
                  matTooltip="Zdroj seznamu modelů: https://api.openai.com/v1/models"
                >
                  <mat-icon class="!text-xs !w-3.5 !h-3.5" [class]="modelSource() === 'openai-api' ? 'text-emerald-400' : 'text-zinc-400'">
                    {{ modelSource() === 'openai-api' ? 'cloud_done' : 'dns' }}
                  </mat-icon>
                  <span>{{ modelSource() === 'openai-api' ? 'API: https://api.openai.com/v1/models' : 'Katalog modelů' }}</span>
                </span>

                <button
                  type="button"
                  (click)="loadDynamicModels(apiKeyInput, organizationInput)"
                  [disabled]="isModelsLoading()"
                  class="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-200 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  matTooltip="Znovu načíst živý seznam modelů z OpenAI API (https://api.openai.com/v1/models)"
                >
                  <mat-icon class="!text-xs !w-3.5 !h-3.5" [class.animate-spin]="isModelsLoading()">refresh</mat-icon>
                  <span>{{ isModelsLoading() ? 'Načítání...' : 'Obnovit z API' }}</span>
                </button>
              </div>
            </div>

            <!-- SELECTED MODEL SHOWCASE HERO (Show selected one better) -->
            <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-zinc-900/90 to-purple-950/50 border-2 border-indigo-500 shadow-xl shadow-indigo-950/40 relative overflow-hidden">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex items-start gap-3.5">
                  <div class="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 shrink-0">
                    <mat-icon class="!text-2xl !w-6 !h-6">{{ selectedModelInfo().isReasoning ? 'psychology' : 'auto_awesome' }}</mat-icon>
                  </div>
                  <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <mat-icon class="!text-[12px] !w-3 !h-3">check_circle</mat-icon>
                        Aktivní volba
                      </span>
                      <span class="text-sm sm:text-base font-bold text-white">{{ selectedModelInfo().name }}</span>
                      <code class="px-2 py-0.5 rounded bg-zinc-950 text-indigo-300 font-mono text-xs border border-zinc-800">{{ selectedModel }}</code>
                    </div>
                    <p class="text-xs text-zinc-300 leading-relaxed">{{ selectedModelInfo().description }}</p>
                    <div class="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      <span class="px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                        <mat-icon class="!text-xs !w-3.5 !h-3.5 text-zinc-400">memory</mat-icon>
                        <span>Kontextové okno: <strong class="text-white">{{ selectedModelInfo().context }}</strong></span>
                      </span>
                      <span class="px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                        <mat-icon class="!text-xs !w-3.5 !h-3.5 text-zinc-400">category</mat-icon>
                        <span>Kategorie: <strong class="text-zinc-200">{{ selectedModelInfo().categoryLabel }}</strong></span>
                      </span>
                      @if (selectedModelInfo().isReasoning) {
                        <span class="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <mat-icon class="!text-xs !w-3.5 !h-3.5 text-amber-400">psychology</mat-icon>
                          <span>Uvažovací model (Aplikuje se Reasoning Effort níže)</span>
                        </span>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- QUICK-PICK POPULAR MODELS -->
            <div class="space-y-2">
              <span class="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <mat-icon class="!text-sm !w-4 !h-4 text-amber-400">flash_on</mat-icon>
                <span>Rychlá volba nejpopulárnějších modelů:</span>
              </span>
              <div class="flex flex-wrap gap-2">
                @for (pm of popularModelsList(); track pm.id) {
                  <button
                    type="button"
                    (click)="selectModel(pm.id)"
                    class="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                    [class]="selectedModel === pm.id ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400' : 'bg-zinc-950 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-white'"
                  >
                    <mat-icon class="!text-xs !w-3.5 !h-3.5" [class]="selectedModel === pm.id ? 'text-white' : 'text-zinc-400'">
                      {{ selectedModel === pm.id ? 'check_circle' : (pm.isReasoning ? 'psychology' : 'smart_toy') }}
                    </mat-icon>
                    <span>{{ pm.name }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- CATEGORY FILTER & SEARCH BAR -->
            <div class="space-y-3 pt-2">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  @for (cat of filterCategories; track cat.id) {
                    <button
                      type="button"
                      (click)="selectedCategory.set(cat.id)"
                      class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer"
                      [class]="selectedCategory() === cat.id ? 'bg-zinc-200 text-zinc-900 font-semibold' : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/60'"
                    >
                      {{ cat.label }} ({{ getCategoryCount(cat.id) }})
                    </button>
                  }
                </div>

                <div class="relative w-full sm:w-64">
                  <input
                    type="text"
                    [ngModel]="searchQuery()"
                    (ngModelChange)="searchQuery.set($event)"
                    placeholder="Hledat v modelech..."
                    class="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <mat-icon class="!text-zinc-400 !text-sm !w-4 !h-4 absolute left-2.5 top-2">search</mat-icon>
                </div>
              </div>

              <!-- MODEL GRID (Show all & Simplified selection) -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                @for (m of filteredModels(); track m.id) {
                  <div
                    matRipple
                    (click)="selectModel(m.id)"
                    class="p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden"
                    [class]="selectedModel === m.id ? 'bg-indigo-950/60 border-indigo-500 shadow-md ring-2 ring-indigo-500/80' : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-start gap-2 min-w-0">
                        <mat-icon class="!text-sm !w-4 !h-4 mt-0.5 shrink-0" [class]="selectedModel === m.id ? 'text-indigo-400' : 'text-zinc-500'">
                          {{ selectedModel === m.id ? 'radio_button_checked' : 'radio_button_unchecked' }}
                        </mat-icon>
                        <div class="min-w-0">
                          <span class="text-xs font-bold text-white block truncate">{{ m.name }}</span>
                          <span class="text-[10px] font-mono text-zinc-400 block truncate">{{ m.id }}</span>
                        </div>
                      </div>

                      <div class="flex items-center gap-1 shrink-0">
                        @if (m.isRecommended) {
                          <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Doporučeno
                          </span>
                        }
                        @if (m.isReasoning) {
                          <span class="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20" matTooltip="Uvažovací model">
                            🧠
                          </span>
                        }
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-800 text-zinc-400">
                          {{ m.context }}
                        </span>
                      </div>
                    </div>

                    <p class="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">{{ m.description }}</p>

                    <div class="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[10px]">
                      <span class="text-zinc-500">{{ m.categoryLabel }}</span>
                      @if (selectedModel === m.id) {
                        <span class="font-semibold text-emerald-400 flex items-center gap-1">
                          <mat-icon class="!text-[12px] !w-3 !h-3">check</mat-icon>
                          Aktivní výběr
                        </span>
                      } @else {
                        <span class="text-zinc-500 hover:text-zinc-300">Zvolit model</span>
                      }
                    </div>
                  </div>
                }
              </div>

              @if (filteredModels().length === 0) {
                <div class="py-8 text-center text-zinc-400 text-xs">
                  Nebyly nalezeny žádné modely odpovídající dotazu "{{ searchQuery() }}".
                </div>
              }
            </div>

            <!-- Custom Model Override -->
            <div class="pt-4 border-t border-zinc-800 space-y-2">
              <label class="block text-xs font-semibold text-zinc-300">Vlastní název modelu (Override)</label>
              <input
                type="text"
                [(ngModel)]="customModelOverride"
                placeholder="např. ft:gpt-4o:my-org:custom-pbr-01"
                class="w-full max-w-md px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <p class="text-[11px] text-zinc-500">Můžete zadat libovolný specifický model nebo fine-tuned endpoint.</p>
            </div>
          </mat-card>

          <!-- Advanced AI Parameters -->
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg space-y-5">
            <h2 class="text-sm font-semibold text-white flex items-center gap-1.5">
              <mat-icon class="!text-sm !w-4 !h-4 text-indigo-400">tune</mat-icon>
              <span>Pokročilé Parametry Generování</span>
            </h2>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <!-- Temperature -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="font-semibold text-zinc-300">Teplota modelu (Kreativita vs Přesnost)</label>
                  <span class="font-mono text-indigo-400 font-bold">{{ temperature }}</span>
                </div>
                <mat-slider min="0" max="1" step="0.05" class="w-full">
                  <input matSliderThumb [(ngModel)]="temperature" />
                </mat-slider>
                <p class="text-[11px] text-zinc-500">Pro technická posouzení PBŘ a normy ČSN se doporučuje hodnota 0.1 – 0.3.</p>
              </div>

              <!-- Reasoning Effort (for o1 / o3 models) -->
              <div class="space-y-2">
                <label class="font-semibold text-zinc-300">Intenzita uvažování (Reasoning Effort)</label>
                <div class="grid grid-cols-3 gap-2">
                  @for (effort of ['low', 'medium', 'high']; track effort) {
                    <button
                      type="button"
                      (click)="reasoningEffort = $any(effort)"
                      class="py-2 rounded-xl font-medium text-xs transition-all cursor-pointer capitalize"
                      [class]="reasoningEffort === effort ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'"
                    >
                      {{ effort }}
                    </button>
                  }
                </div>
                <p class="text-[11px] text-zinc-500">Aplikuje se na uvažovací modely řady o1 a o3-mini.</p>
              </div>

              <!-- Organization ID -->
              <div class="space-y-1.5">
                <label class="font-semibold text-zinc-300">OpenAI Organization ID (Volitelné)</label>
                <input
                  type="text"
                  [(ngModel)]="organizationInput"
                  placeholder="org-..."
                  class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <!-- Web Search -->
              <div class="space-y-1.5 flex flex-col justify-center">
                <mat-slide-toggle [(ngModel)]="enableWebSearch" color="primary">
                  <span class="font-semibold text-zinc-200 text-xs">Povolit vyhledávání na webu (Web Search)</span>
                </mat-slide-toggle>
                <p class="text-[11px] text-zinc-500">Umožňuje modelu dohledávat aktuální normové vyhlášky a technické listy.</p>
              </div>
            </div>
          </mat-card>

          <!-- Pricing Reference Card -->
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg space-y-4">
            <h2 class="text-sm font-semibold text-white flex items-center gap-1.5">
              <mat-icon class="!text-sm !w-4 !h-4 text-emerald-400">payments</mat-icon>
              <span>Orientační Přehled Nákladů (Ceník OpenAI za 1M tokenů)</span>
            </h2>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-zinc-800 text-zinc-400">
                    <th class="py-2">Model</th>
                    <th class="py-2">Vstupní cena / 1M</th>
                    <th class="py-2">Výstupní cena / 1M</th>
                    <th class="py-2">Doporučené použití pro PBŘ</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800/60 text-zinc-300">
                  <tr>
                    <td class="py-2.5 font-semibold text-white">GPT-6 Luna</td>
                    <td class="py-2.5 font-mono text-zinc-400">$0.10</td>
                    <td class="py-2.5 font-mono text-zinc-400">$0.40</td>
                    <td class="py-2.5 text-zinc-400">Nejrychlejší a nejlevnější model GPT-6 s 1.05M kontextem pro hromadné úlohy</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 font-semibold text-white">GPT-4o Mini</td>
                    <td class="py-2.5 font-mono text-zinc-400">$0.15</td>
                    <td class="py-2.5 font-mono text-zinc-400">$0.60</td>
                    <td class="py-2.5 text-zinc-400">Běžná popisná pole, rychlé formulace, nízké náklady</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 font-semibold text-white">GPT-6.1 Sol</td>
                    <td class="py-2.5 font-mono text-zinc-400">$1.00</td>
                    <td class="py-2.5 font-mono text-zinc-400">$4.00</td>
                    <td class="py-2.5 text-zinc-400">Vyvážený model GPT-6 pro každodenní technické výpočty a normové posudky</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 font-semibold text-white">o3-mini</td>
                    <td class="py-2.5 font-mono text-zinc-400">$1.10</td>
                    <td class="py-2.5 font-mono text-zinc-400">$4.40</td>
                    <td class="py-2.5 text-zinc-400">Inženýrské normové kontroly ČSN, odstupové vzdálenosti, STEM</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 font-semibold text-white">GPT-4o (Omni)</td>
                    <td class="py-2.5 font-mono text-zinc-400">$2.50</td>
                    <td class="py-2.5 font-mono text-zinc-400">$10.00</td>
                    <td class="py-2.5 text-zinc-400">Vlajkový model pro komplexní texty PBŘ a analýzy příloh</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 font-semibold text-white">GPT-6 Astra</td>
                    <td class="py-2.5 font-mono text-zinc-400">$5.00</td>
                    <td class="py-2.5 font-mono text-zinc-400">$20.00</td>
                    <td class="py-2.5 text-zinc-400">Špičkový vlajkový reasoning model nové generace s 1.05M oknem</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 font-semibold text-white">o1 (Full Reasoning)</td>
                    <td class="py-2.5 font-mono text-zinc-400">$15.00</td>
                    <td class="py-2.5 font-mono text-zinc-400">$60.00</td>
                    <td class="py-2.5 text-zinc-400">Nejsložitější inženýrské výpočty a atypická stavební řešení</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 font-semibold text-white">GPT-4.5 Preview</td>
                    <td class="py-2.5 font-mono text-zinc-400">$75.00</td>
                    <td class="py-2.5 font-mono text-zinc-400">$150.00</td>
                    <td class="py-2.5 text-zinc-400">Nejrozsáhlejší znalostní báze pro komplexní stavby</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </mat-card>

          <!-- Save Button Bar -->
          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              mat-flat-button
              color="primary"
              type="button"
              (click)="saveSettings()"
              [disabled]="isSaving()"
              class="!rounded-xl !px-6 !py-2.5 !text-xs !font-semibold"
            >
              <mat-icon class="!text-sm !w-4 !h-4 !mr-1">save</mat-icon>
              {{ isSaving() ? 'Ukládání konfigurace...' : 'Uložit veškerá AI nastavení' }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class UserAiSettingsComponent implements OnInit {
  private aiSettingsService = inject(AiSettingsService);

  readonly config = signal<UserOpenAiConfigStatus | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly isValidating = signal<boolean>(false);
  readonly isModelsLoading = signal<boolean>(false);
  readonly modelSource = signal<'openai-api' | 'catalog'>('catalog');
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly validationStatus = signal<{ success: boolean; completion?: string; error?: string } | null>(null);
  validationLatencyMs: number = 0;

  readonly allModels = signal<ModelItem[]>(ALL_OPENAI_MODELS);
  readonly popularModelsList = computed<ModelItem[]>(() => {
    const models = this.allModels();
    const popularIds = [
      'gpt-6-astra',
      'gpt-6.1-sol',
      'gpt-6-luna',
      'gpt-4o',
      'gpt-4o-mini',
      'o3-mini',
      'o1',
      'gpt-4.5-preview',
      'o4-mini',
      'gpt-4-turbo',
    ];
    return models.filter((m) => popularIds.includes(m.id));
  });

  readonly filterCategories = [
    { id: 'all', label: 'Všechny modely' },
    { id: 'flagship', label: '🌟 Vlajkové' },
    { id: 'fast', label: '⚡ Rychlé & Úsporné' },
    { id: 'reasoning', label: '🧠 Reasoning' },
    { id: 'legacy', label: '📦 Předchozí & Snapshoty' },
  ];

  readonly selectedCategory = signal<string>('all');
  readonly searchQuery = signal<string>('');

  apiKeyInput: string = '';
  showKey: boolean = false;
  selectedModel: string = 'gpt-4o';
  customModelOverride: string = '';
  temperature: number = 0.2;
  reasoningEffort: 'low' | 'medium' | 'high' = 'medium';
  organizationInput: string = '';
  enableWebSearch: boolean = false;

  readonly selectedModelInfo = computed<ModelItem>(() => {
    const currentId = this.selectedModel;
    const found = this.allModels().find((m) => m.id === currentId);
    if (found) return found;

    return {
      id: currentId,
      name: currentId,
      category: 'preview',
      categoryLabel: 'Vlastní / Externí model',
      description: 'Uživatelsky zvolený nebo externí model OpenAI.',
      context: 'Auto',
      isReasoning: currentId.startsWith('o1') || currentId.startsWith('o3') || currentId.startsWith('o4'),
    };
  });

  readonly filteredModels = computed<ModelItem[]>(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return this.allModels().filter((m) => {
      const matchCat = cat === 'all' || m.category === cat;
      if (!matchCat) return false;

      if (!query) return true;

      return (
        m.id.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.categoryLabel.toLowerCase().includes(query)
      );
    });
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  getCategoryCount(categoryId: string): number {
    if (categoryId === 'all') return this.allModels().length;
    return this.allModels().filter((m) => m.category === categoryId).length;
  }

  loadDynamicModels(apiKey?: string, organization?: string): void {
    this.isModelsLoading.set(true);
    this.aiSettingsService.getAvailableModels(apiKey, organization).subscribe({
      next: (res) => {
        if (res.modelDetails && res.modelDetails.length > 0) {
          const mapped: ModelItem[] = res.modelDetails.map((d) => ({
            id: d.id,
            name: d.name || d.id,
            category: (d.category as any) || 'flagship',
            categoryLabel: d.categoryLabel || 'Modely',
            description: d.description || '',
            context: d.contextWindow || '128k',
            isReasoning: d.isReasoning,
            isRecommended: d.isRecommended,
          }));
          this.allModels.set(mapped);
          this.modelSource.set(res.source);
        }
        this.isModelsLoading.set(false);
      },
      error: () => {
        this.isModelsLoading.set(false);
      },
    });
  }

  loadSettings(): void {
    this.isLoading.set(true);
    this.aiSettingsService.getSettings().subscribe({
      next: (res) => {
        if (res.config) {
          this.config.set(res.config);
          this.selectedModel = res.config.defaultModel || 'gpt-4o';
          this.enableWebSearch = res.config.webSearchEnabled ?? false;
          this.temperature = res.config.temperature ?? 0.2;
          this.reasoningEffort = res.config.reasoningEffort || 'medium';
          this.customModelOverride = res.config.customModel || '';
          this.organizationInput = res.config.organization || '';
        }
        this.isLoading.set(false);
        this.loadDynamicModels(undefined, this.organizationInput);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se načíst konfiguraci AI.');
        this.isLoading.set(false);
        this.loadDynamicModels();
      },
    });
  }

  selectModel(modelId: string): void {
    this.selectedModel = modelId;
  }

  testApiKey(): void {
    if (!this.apiKeyInput) return;

    this.isValidating.set(true);
    this.validationStatus.set(null);
    const start = Date.now();

    this.aiSettingsService
      .validateApiKey(this.apiKeyInput, this.selectedModel, this.organizationInput)
      .subscribe({
        next: (res) => {
          this.validationLatencyMs = Date.now() - start;
          this.validationStatus.set(res);
          this.isValidating.set(false);
          if (res.success) {
            this.loadDynamicModels(this.apiKeyInput, this.organizationInput);
          }
        },
        error: (err) => {
          this.validationLatencyMs = Date.now() - start;
          this.validationStatus.set({
            success: false,
            error: err.message || 'Spojení s OpenAI selhalo',
          });
          this.isValidating.set(false);
        },
      });
  }

  saveSettings(): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload: UserOpenAiSettingsInput = {
      defaultModel: this.selectedModel,
      webSearchEnabled: this.enableWebSearch,
      temperature: this.temperature,
      reasoningEffort: this.reasoningEffort,
      customModel: this.customModelOverride || undefined,
      organization: this.organizationInput || undefined,
    };

    if (this.apiKeyInput) {
      payload.apiKey = this.apiKeyInput;
    }

    this.aiSettingsService.saveSettings(payload).subscribe({
      next: (res) => {
        this.successMessage.set('AI konfigurace byla úspěšně uložena.');
        this.config.set(res.config);
        this.apiKeyInput = '';
        this.isSaving.set(false);
        this.loadDynamicModels(undefined, this.organizationInput);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při ukládání AI konfigurace.');
        this.isSaving.set(false);
      },
    });
  }

  clearApiKey(): void {
    if (!confirm('Opravdu chcete odstranit svůj osobní OpenAI klíč a přejít zpět na systémový?')) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    this.aiSettingsService.deleteSettings().subscribe({
      next: (res) => {
        this.successMessage.set('Váš osobní OpenAI klíč byl odstraněn. Systém nyní používá výchozí klíč.');
        this.config.set(res.config);
        this.apiKeyInput = '';
        this.isSaving.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při odstraňování klíče.');
        this.isSaving.set(false);
      },
    });
  }
}
