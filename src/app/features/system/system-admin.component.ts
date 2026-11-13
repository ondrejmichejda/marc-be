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
import { AuthService } from '../../core/services/auth.service';
import { TelegramService } from '../../core/services/telegram.service';
import { OpenAiService } from '../../core/services/openai.service';
import { User, RoleDefinition, MenuItem, RolesResponse } from '../../core/models/auth.models';
import { TelegramStatusResponse, TelegramMessageLog, BroadcastResult } from '../../core/models/telegram.models';
import { OpenAiUsageSummary, OpenAiConfigStatus, OpenAiMessageLog, OpenAiModelInfo } from '../../core/models/openai.models';

type SystemTab = 'users' | 'roles' | 'mappings' | 'telegram' | 'openai';

@Component({
  selector: 'app-system-admin',
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
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <mat-icon class="!text-indigo-400">admin_panel_settings</mat-icon>
            <span>Systémová Administrace</span>
          </h1>
          <p class="text-xs sm:text-sm text-zinc-400 mt-1">
            Správa uživatelských rolí, mapování navigačního menu, Telegram bota, OpenAI telemetrie a systémových parametrů.
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

      <!-- Sub Tabs Navigation -->
      <div class="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-x-auto text-xs pb-1 sm:pb-1.5">
        <button
          matRipple
          type="button"
          (click)="activeTab.set('users')"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap"
          [class]="activeTab() === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'"
        >
          <mat-icon class="!text-sm !w-4 !h-4">people</mat-icon>
          <span>Správa Uživatelů</span>
        </button>

        <button
          matRipple
          type="button"
          (click)="activeTab.set('roles')"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap"
          [class]="activeTab() === 'roles' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'"
        >
          <mat-icon class="!text-sm !w-4 !h-4">security</mat-icon>
          <span>Role &amp; Oprávnění</span>
        </button>

        <button
          matRipple
          type="button"
          (click)="activeTab.set('mappings')"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap"
          [class]="activeTab() === 'mappings' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'"
        >
          <mat-icon class="!text-sm !w-4 !h-4">map</mat-icon>
          <span>Mapování Menu</span>
        </button>

        <button
          matRipple
          type="button"
          (click)="activeTab.set('telegram')"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap"
          [class]="activeTab() === 'telegram' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'"
        >
          <mat-icon class="!text-sm !w-4 !h-4">smart_toy</mat-icon>
          <span>Telegram Bot &amp; Webhook</span>
        </button>

        <button
          matRipple
          type="button"
          (click)="activeTab.set('openai')"
          class="flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap"
          [class]="activeTab() === 'openai' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'"
        >
          <mat-icon class="!text-sm !w-4 !h-4">analytics</mat-icon>
          <span>OpenAI Telemetrie &amp; Test</span>
        </button>
      </div>

      <!-- Tab Content: Users Management -->
      @if (activeTab() === 'users') {
        <div class="space-y-4 animate-in fade-in">
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-sm font-semibold text-white">Registrovaní Uživatelé Systému</h2>
                <p class="text-xs text-zinc-400 mt-0.5">Přiřazujte role uživatelům pro řízení přístupových práv v systému.</p>
              </div>
              <button
                mat-stroked-button
                type="button"
                (click)="loadUsers()"
                class="!rounded-xl !text-xs"
              >
                <mat-icon class="!text-sm !w-4 !h-4 !mr-1">refresh</mat-icon>
                Obnovit uživatele
              </button>
            </div>

            @if (isLoadingUsers()) {
              <div class="py-8 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
                <mat-spinner diameter="20"></mat-spinner>
                <span>Načítání uživatelů...</span>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="border-b border-zinc-800 text-zinc-400">
                      <th class="py-3 px-3">Uživatel</th>
                      <th class="py-3 px-3">E-mail</th>
                      <th class="py-3 px-3">Přiřazená Role</th>
                      <th class="py-3 px-3">Registrace</th>
                      <th class="py-3 px-3 text-right">Akce</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-zinc-800/60 text-zinc-300">
                    @for (u of users(); track u.id) {
                      <tr class="hover:bg-zinc-800/30">
                        <td class="py-3 px-3 flex items-center gap-2.5">
                          @if (u.picture) {
                            <img [src]="u.picture" class="h-6 w-6 rounded-full" alt="avatar" />
                          } @else {
                            <div class="h-6 w-6 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                              {{ u.name ? u.name.charAt(0) : 'U' }}
                            </div>
                          }
                          <span class="font-medium text-white">{{ u.name }}</span>
                        </td>
                        <td class="py-3 px-3 font-mono text-zinc-400">{{ u.email }}</td>
                        <td class="py-3 px-3">
                          <select
                            [ngModel]="u.role"
                            (ngModelChange)="onUserRoleChange(u.id, $event)"
                            class="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            @for (role of availableRoles(); track role.id) {
                              <option [value]="role.id">{{ role.name }} ({{ role.id }})</option>
                            }
                          </select>
                        </td>
                        <td class="py-3 px-3 text-zinc-500">{{ (u.createdAt | date:'shortDate') || '–' }}</td>
                        <td class="py-3 px-3 text-right">
                          <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Aktivní
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </mat-card>
        </div>
      }

      <!-- Tab Content: Roles Management -->
      @if (activeTab() === 'roles') {
        <div class="space-y-6 animate-in fade-in">
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-sm font-semibold text-white">Definice Systémových a Uživatelských Rolí</h2>
                <p class="text-xs text-zinc-400 mt-0.5">Přehled existujících rolí a možnost vytváření nových přístupových skupin.</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (r of availableRoles(); track r.id) {
                <div class="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3 flex flex-col justify-between">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                        {{ r.name }}
                      </span>
                      <span class="text-[11px] font-mono text-zinc-500">Úroveň {{ r.level || 1 }}</span>
                    </div>
                    <p class="text-xs text-zinc-400">{{ r.description }}</p>
                    <span class="text-[10px] font-mono text-zinc-500 block">ID: {{ r.id }}</span>
                  </div>

                  <div class="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <span class="text-[10px]" [class]="r.isSystem ? 'text-zinc-500' : 'text-amber-400'">
                      {{ r.isSystem ? 'Systémová role (Chráněno)' : 'Uživatelská role' }}
                    </span>
                    @if (!r.isSystem) {
                      <button
                        type="button"
                        (click)="deleteCustomRole(r.id)"
                        class="text-rose-400 hover:text-rose-300 text-xs cursor-pointer flex items-center gap-1"
                        title="Smazat roli"
                      >
                        <mat-icon class="!text-xs !w-3.5 !h-3.5">delete</mat-icon>
                        <span>Smazat</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Create Custom Role Card -->
            <div class="pt-4 border-t border-zinc-800 space-y-3">
              <h3 class="text-xs font-bold text-zinc-200">Vytvořit novou roli</h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  type="text"
                  [(ngModel)]="newRoleForm.id"
                  placeholder="ID role (např. auditor)"
                  class="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <input
                  type="text"
                  [(ngModel)]="newRoleForm.name"
                  placeholder="Název role (např. PBŘ Auditor)"
                  class="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  [(ngModel)]="newRoleForm.description"
                  placeholder="Popis oprávnění..."
                  class="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div class="flex justify-end">
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  (click)="createCustomRole()"
                  [disabled]="!newRoleForm.id || !newRoleForm.name"
                  class="!rounded-xl !text-xs !font-semibold"
                >
                  <mat-icon class="!text-sm !w-4 !h-4 !mr-1">add</mat-icon>
                  Vytvořit roli
                </button>
              </div>
            </div>
          </mat-card>
        </div>
      }

      <!-- Tab Content: Dynamic Menu Mappings Matrix -->
      @if (activeTab() === 'mappings') {
        <div class="space-y-4 animate-in fade-in">
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 class="text-sm font-semibold text-white">Dynamické Mapování Položek Menu k Rolím</h2>
                <p class="text-xs text-zinc-400 mt-0.5">Zaškrtněte položky menu, ke kterým má mít každá role přístup v levé navigaci.</p>
              </div>
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="saveMenuMappings()"
                [disabled]="isSavingMappings()"
                class="!rounded-xl !text-xs !font-semibold"
              >
                <mat-icon class="!text-sm !w-4 !h-4 !mr-1">save</mat-icon>
                {{ isSavingMappings() ? 'Ukládání...' : 'Uložit mapování menu' }}
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border border-zinc-800 rounded-xl overflow-hidden">
                <thead>
                  <tr class="bg-zinc-950 border-b border-zinc-800 text-zinc-300">
                    <th class="py-3 px-4">Položka Menu</th>
                    <th class="py-3 px-4">Kategorie</th>
                    @for (r of availableRoles(); track r.id) {
                      <th class="py-3 px-3 text-center font-semibold font-mono text-indigo-300">{{ r.name }}</th>
                    }
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800/60 bg-zinc-900/50 text-zinc-200">
                  @for (item of allMenuItems(); track item.id) {
                    <tr class="hover:bg-zinc-800/40">
                      <td class="py-3 px-4 flex items-center gap-2">
                        <span>{{ item.icon }}</span>
                        <div>
                          <strong class="block text-white">{{ item.label }}</strong>
                          <span class="text-[10px] text-zinc-500">{{ item.description }}</span>
                        </div>
                      </td>
                      <td class="py-3 px-4 text-zinc-400">{{ item.category }}</td>
                      @for (r of availableRoles(); track r.id) {
                        <td class="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            [checked]="isMenuAllowed(item.id, r.id)"
                            (change)="toggleMenuMapping(item.id, r.id, $event)"
                            class="rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-0 h-4 w-4 cursor-pointer"
                          />
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </mat-card>
        </div>
      }

      <!-- Tab Content: Telegram Bot -->
      @if (activeTab() === 'telegram') {
        <div class="space-y-6 animate-in fade-in">
          <!-- Bot Profile & Status -->
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-sm font-semibold text-white">Stav Telegram Bota &amp; Webhook</h2>
                <p class="text-xs text-zinc-400 mt-0.5">GrammY integrace, telemetrie webhooku a doručování zpráv.</p>
              </div>
              <button
                mat-stroked-button
                type="button"
                (click)="loadTelegramStatus()"
                class="!rounded-xl !text-xs"
              >
                <mat-icon class="!text-sm !w-4 !h-4 !mr-1">refresh</mat-icon>
                Ověřit stav
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div class="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <span class="text-zinc-500 block mb-1">Bot Username &amp; Název</span>
                <span class="text-sm font-semibold text-white">{{ telegramData()?.bot?.username ? ('@' + telegramData()?.bot?.username) : '@MarcPB_bot' }}</span>
                <span class="text-[10px] text-zinc-500 block mt-0.5">{{ telegramData()?.bot?.first_name || 'MARC System Bot' }}</span>
              </div>

              <div class="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <span class="text-zinc-500 block mb-1">Webhook URL</span>
                <span class="text-xs font-mono text-zinc-200 block truncate">{{ telegramData()?.webhook?.url || 'Nenastaveno' }}</span>
                <span class="text-[10px] text-zinc-500 block mt-0.5">Čekající zprávy: {{ telegramData()?.webhook?.pending_update_count || 0 }}</span>
              </div>

              <div class="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <span class="text-zinc-500 block mb-1">Stav Webhooku</span>
                <span
                  class="inline-block px-2.5 py-1 rounded text-[10px] font-semibold"
                  [class]="telegramData()?.webhook?.url ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'"
                >
                  {{ telegramData()?.webhook?.url ? '✓ Webhook Aktivní' : 'Nekonfigurováno' }}
                </span>
                @if (telegramData()?.webhook?.last_error_message) {
                  <span class="text-[10px] text-rose-400 block mt-1 truncate">Chyba: {{ telegramData()?.webhook?.last_error_message }}</span>
                }
              </div>
            </div>

            <!-- Set Webhook URL -->
            <div class="space-y-2 pt-2 border-t border-zinc-800">
              <label class="block text-xs font-semibold text-zinc-300">Nastavit Webhook URL</label>
              <div class="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  [(ngModel)]="customWebhookUrl"
                  placeholder="https://your-domain.vercel.app/api/telegram/webhook"
                  class="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <div class="flex items-center gap-2">
                  <button
                    mat-flat-button
                    color="primary"
                    type="button"
                    (click)="setupWebhook()"
                    [disabled]="isSettingWebhook()"
                    class="!rounded-xl !text-xs !font-semibold whitespace-nowrap"
                  >
                    {{ isSettingWebhook() ? 'Nastavuji...' : 'Aktivovat Webhook' }}
                  </button>
                  <button
                    mat-button
                    type="button"
                    (click)="deleteWebhook()"
                    class="!rounded-xl !text-rose-400 !text-xs whitespace-nowrap"
                  >
                    Smazat webhook
                  </button>
                </div>
              </div>
            </div>

            <!-- Send Broadcast Deployment Notification -->
            <div class="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-semibold text-white">Hromadné Odeslání Deployment Notifikace</p>
                  <p class="text-[11px] text-zinc-400">Odešle zprávu do Telegramu všem aktivním odběratelům o nasazení nové verze.</p>
                </div>
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  (click)="sendBroadcastNotification()"
                  [disabled]="isSendingNotify()"
                  class="!rounded-xl !text-xs !font-semibold"
                >
                  <mat-icon class="!text-sm !w-4 !h-4 !mr-1">send</mat-icon>
                  {{ isSendingNotify() ? 'Odesílám...' : 'Odeslat do Telegramu' }}
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <input
                  type="text"
                  [(ngModel)]="broadcastForm.version"
                  placeholder="Verze (např. v2.4.0-angular-spa)"
                  class="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500"
                />
                <input
                  type="text"
                  [(ngModel)]="broadcastForm.releaseNotes"
                  placeholder="Release notes / popis změn..."
                  class="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500"
                />
              </div>
            </div>
          </mat-card>

          <!-- Telegram Message Log History -->
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 class="text-sm font-semibold text-white">Historie Zpráv Telegramu</h3>
                <p class="text-xs text-zinc-400 mt-0.5">Záznam příchozích a odchozích zpráv bota.</p>
              </div>
              <button
                mat-stroked-button
                type="button"
                (click)="loadTelegramMessages()"
                class="!rounded-xl !text-xs"
              >
                <mat-icon class="!text-sm !w-4 !h-4 !mr-1">refresh</mat-icon>
                Obnovit zprávy
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-zinc-800 text-zinc-400">
                    <th class="py-2.5 px-3">Směr</th>
                    <th class="py-2.5 px-3">Uživatel / Chat</th>
                    <th class="py-2.5 px-3">Text Zprávy</th>
                    <th class="py-2.5 px-3">Čas</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800/60 text-zinc-300">
                  @for (msg of telegramMessages(); track msg.id) {
                    <tr class="hover:bg-zinc-800/30">
                      <td class="py-2.5 px-3">
                        <span
                          class="px-2 py-0.5 rounded text-[10px] font-semibold"
                          [class]="msg.direction === 'incoming' ? 'bg-sky-500/10 text-sky-400' : 'bg-purple-500/10 text-purple-400'"
                        >
                          {{ msg.direction === 'incoming' ? 'Příchozí' : 'Odchozí' }}
                        </span>
                      </td>
                      <td class="py-2.5 px-3 font-mono text-zinc-400">
                        {{ msg.firstName || msg.username || msg.chatId }}
                      </td>
                      <td class="py-2.5 px-3 text-zinc-200 max-w-md truncate">
                        {{ msg.text || '–' }}
                      </td>
                      <td class="py-2.5 px-3 text-zinc-500">{{ msg.createdAt | date:'short' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </mat-card>
        </div>
      }

      <!-- Tab Content: OpenAI Analytics & Telemetry -->
      @if (activeTab() === 'openai') {
        <div class="space-y-6 animate-in fade-in">
          <!-- Metrics Overview -->
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-sm font-semibold text-white">OpenAI Telemetrie &amp; Využití Tokenů</h2>
                <p class="text-xs text-zinc-400 mt-0.5">Statistiky volání AI API, spotřebovaných tokenů a nákladů.</p>
              </div>
              <button
                mat-stroked-button
                type="button"
                (click)="loadOpenAiData()"
                class="!rounded-xl !text-xs"
              >
                <mat-icon class="!text-sm !w-4 !h-4 !mr-1">refresh</mat-icon>
                Obnovit data
              </button>
            </div>

            @if (openAiUsage(); as usage) {
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div class="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span class="text-zinc-500 block mb-1">Celkem požadavků</span>
                  <span class="text-lg font-bold text-white">{{ usage.totalRequests }}</span>
                </div>

                <div class="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span class="text-zinc-500 block mb-1">Spotřebované Tokeny</span>
                  <span class="text-lg font-bold text-indigo-400">{{ usage.totalTokens }}</span>
                </div>

                <div class="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span class="text-zinc-500 block mb-1">Odhadovaná Cena USD</span>
                  <span class="text-lg font-bold text-emerald-400">&#36;{{ usage.estimatedTotalCostUsd | number:'1.4-4' }}</span>
                </div>

                <div class="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <span class="text-zinc-500 block mb-1">Průměrná Latence</span>
                  <span class="text-lg font-bold text-white">{{ usage.averageDurationMs }} ms</span>
                </div>
              </div>

              <!-- Models breakdown -->
              @if (usage.modelsUsed && usage.modelsUsed.length > 0) {
                <div class="space-y-3 pt-2">
                  <h3 class="text-xs font-bold text-zinc-200">Využití dle Jednotlivých Modelů</h3>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    @for (m of usage.modelsUsed; track m.model) {
                      <div class="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs space-y-1">
                        <div class="flex items-center justify-between font-semibold">
                          <span class="text-white">{{ m.model }}</span>
                          <span class="text-emerald-400 font-mono">&#36;{{ m.estimatedCostUsd | number:'1.4-4' }}</span>
                        </div>
                        <p class="text-[11px] text-zinc-400">Požadavky: {{ m.requestsCount }} • Tokeny: {{ m.totalTokens }}</p>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </mat-card>

          <!-- Live AI Test Playground -->
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg space-y-4">
            <h3 class="text-sm font-semibold text-white flex items-center gap-1.5">
              <mat-icon class="!text-sm !w-4 !h-4 text-indigo-400">science</mat-icon>
              <span>OpenAI Testovací Playground</span>
            </h3>
            <div class="space-y-3 text-xs">
              <div class="space-y-1">
                <label class="font-semibold text-zinc-300">Systémový prompt (Volitelný)</label>
                <input
                  type="text"
                  [(ngModel)]="playgroundSystemPrompt"
                  placeholder="Jsi zkušený stavební inženýr..."
                  class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500"
                />
              </div>

              <div class="space-y-1">
                <label class="font-semibold text-zinc-300">Uživatelský prompt pro test</label>
                <textarea
                  rows="3"
                  [(ngModel)]="playgroundPrompt"
                  placeholder="Zadejte testovací dotaz..."
                  class="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 font-mono"
                ></textarea>
              </div>

              <div class="flex justify-end">
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  (click)="runPlaygroundTest()"
                  [disabled]="isRunningPlayground() || !playgroundPrompt"
                  class="!rounded-xl !text-xs !font-semibold"
                >
                  <mat-icon class="!text-sm !w-4 !h-4 !mr-1">play_arrow</mat-icon>
                  {{ isRunningPlayground() ? 'Generování odpovědi...' : 'Spustit test completion' }}
                </button>
              </div>

              @if (playgroundResponse()) {
                <div class="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 mt-3">
                  <span class="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <mat-icon class="!text-xs !w-3.5 !h-3.5">check_circle</mat-icon>
                    Výstup modelu:
                  </span>
                  <div class="font-sans text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {{ playgroundResponse() }}
                  </div>
                </div>
              }
            </div>
          </mat-card>

          <!-- Message Logs History -->
          <mat-card class="!p-6 !rounded-2xl !bg-zinc-900/80 !border !border-zinc-800 !shadow-lg space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-white">Historie OpenAI Volání</h3>
                <p class="text-xs text-zinc-400 mt-0.5">Posledních 50 zaznamenaných požadavků na AI modely.</p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  mat-button
                  type="button"
                  (click)="clearOpenAiLogs()"
                  class="!rounded-xl !text-rose-400 !text-xs"
                >
                  Smazat historii
                </button>
                <button
                  mat-stroked-button
                  type="button"
                  (click)="loadOpenAiLogs()"
                  class="!rounded-xl !text-xs"
                >
                  <mat-icon class="!text-sm !w-4 !h-4 !mr-1">refresh</mat-icon>
                  Obnovit
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-zinc-800 text-zinc-400">
                    <th class="py-2.5 px-3">Model</th>
                    <th class="py-2.5 px-3">Prompt</th>
                    <th class="py-2.5 px-3">Tokeny</th>
                    <th class="py-2.5 px-3">Čas</th>
                    <th class="py-2.5 px-3 text-right">Stav</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800/60 text-zinc-300">
                  @for (log of openAiLogs(); track log.id) {
                    <tr class="hover:bg-zinc-800/30">
                      <td class="py-2.5 px-3 font-semibold text-white">{{ log.model }}</td>
                      <td class="py-2.5 px-3 text-zinc-300 max-w-sm truncate">{{ log.prompt }}</td>
                      <td class="py-2.5 px-3 font-mono text-zinc-400">{{ log.totalTokens }}</td>
                      <td class="py-2.5 px-3 text-zinc-500">{{ log.createdAt | date:'shortTime' }}</td>
                      <td class="py-2.5 px-3 text-right">
                        <span
                          class="px-2 py-0.5 rounded text-[10px] font-semibold"
                          [class]="log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'"
                        >
                          {{ log.status }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </mat-card>
        </div>
      }
    </div>
  `,
})
export class SystemAdminComponent implements OnInit {
  private authService = inject(AuthService);
  private telegramService = inject(TelegramService);
  private openAiService = inject(OpenAiService);

  readonly activeTab = signal<SystemTab>('users');
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Users & Roles state
  readonly users = signal<User[]>([]);
  readonly isLoadingUsers = signal<boolean>(false);
  readonly availableRoles = signal<RoleDefinition[]>([]);
  readonly allMenuItems = signal<MenuItem[]>([]);
  readonly menuMappings = signal<Record<string, string[]>>({});
  readonly isSavingMappings = signal<boolean>(false);

  newRoleForm = { id: '', name: '', description: '' };

  // Telegram state
  readonly telegramData = signal<TelegramStatusResponse | null>(null);
  readonly telegramMessages = signal<TelegramMessageLog[]>([]);
  readonly isSettingWebhook = signal<boolean>(false);
  readonly isSendingNotify = signal<boolean>(false);
  customWebhookUrl: string = '';
  broadcastForm = { version: 'v2.4.0-angular-spa', releaseNotes: 'Plná migrace frontendu na Angular 22 SPA.' };

  // OpenAI state
  readonly openAiUsage = signal<OpenAiUsageSummary | null>(null);
  readonly openAiLogs = signal<OpenAiMessageLog[]>([]);
  readonly isRunningPlayground = signal<boolean>(false);
  readonly playgroundResponse = signal<string | null>(null);
  playgroundPrompt: string = 'Vypiš stručné shrnutí ČSN 73 0802 pro bytové domy v 3 bodech.';
  playgroundSystemPrompt: string = 'Jsi specialista PBŘ.';

  ngOnInit(): void {
    this.loadUsers();
    this.loadRolesAndMappings();
    this.loadTelegramStatus();
    this.loadOpenAiData();
  }

  loadUsers(): void {
    this.isLoadingUsers.set(true);
    this.authService.getUsers().subscribe({
      next: (res) => {
        this.users.set(res.users || []);
        this.isLoadingUsers.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se načíst uživatele.');
        this.isLoadingUsers.set(false);
      },
    });
  }

  loadRolesAndMappings(): void {
    this.authService.getRoles().subscribe({
      next: (res) => {
        if (res.definitions) {
          this.availableRoles.set(Object.values(res.definitions));
        }
        if (res.allMenuItems) {
          this.allMenuItems.set(res.allMenuItems);
        }
        if (res.mappings) {
          this.menuMappings.set(res.mappings);
        }
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se načíst role a mapování.');
      },
    });
  }

  onUserRoleChange(userId: string, role: string): void {
    this.authService.updateUserRole(userId, role).subscribe({
      next: () => {
        this.successMessage.set(`Role uživatele byla aktualizována na '${role}'.`);
        this.loadUsers();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při změně role uživatele.');
      },
    });
  }

  createCustomRole(): void {
    if (!this.newRoleForm.id || !this.newRoleForm.name) return;

    this.authService
      .createRole({
        id: this.newRoleForm.id.toLowerCase().trim(),
        name: this.newRoleForm.name.trim(),
        description: this.newRoleForm.description.trim(),
      })
      .subscribe({
        next: () => {
          this.successMessage.set(`Role '${this.newRoleForm.name}' byla vytvořena.`);
          this.newRoleForm = { id: '', name: '', description: '' };
          this.loadRolesAndMappings();
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Chyba při vytváření role.');
        },
      });
  }

  deleteCustomRole(roleId: string): void {
    if (!confirm(`Opravdu chcete smazat roli '${roleId}'?`)) return;

    this.authService.deleteRole(roleId).subscribe({
      next: () => {
        this.successMessage.set(`Role '${roleId}' byla smazána.`);
        this.loadRolesAndMappings();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při mazání role.');
      },
    });
  }

  isMenuAllowed(menuId: string, roleId: string): boolean {
    const roles = this.menuMappings()[menuId] || [];
    return roles.includes(roleId);
  }

  toggleMenuMapping(menuId: string, roleId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentMappings = { ...this.menuMappings() };
    const currentRoles = [...(currentMappings[menuId] || [])];

    if (checked) {
      if (!currentRoles.includes(roleId)) currentRoles.push(roleId);
    } else {
      const idx = currentRoles.indexOf(roleId);
      if (idx !== -1) currentRoles.splice(idx, 1);
    }

    currentMappings[menuId] = currentRoles;
    this.menuMappings.set(currentMappings);
  }

  saveMenuMappings(): void {
    this.isSavingMappings.set(true);
    this.authService.updateMenuMappings(this.menuMappings()).subscribe({
      next: () => {
        this.successMessage.set('Mapování položek menu k rolím bylo úspěšně uloženo.');
        this.isSavingMappings.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při ukládání mapování menu.');
        this.isSavingMappings.set(false);
      },
    });
  }

  loadTelegramStatus(): void {
    this.telegramService.getStatus().subscribe({
      next: (res) => {
        this.telegramData.set(res);
        if (res.webhook?.url) {
          this.customWebhookUrl = res.webhook.url;
        }
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Nepodařilo se ověřit stav Telegramu.');
      },
    });
    this.loadTelegramMessages();
  }

  setupWebhook(): void {
    this.isSettingWebhook.set(true);
    this.telegramService.setupWebhook(this.customWebhookUrl || undefined).subscribe({
      next: () => {
        this.successMessage.set('Telegram Webhook byl úspěšně aktivován.');
        this.isSettingWebhook.set(false);
        this.loadTelegramStatus();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při nastavování webhooku.');
        this.isSettingWebhook.set(false);
      },
    });
  }

  deleteWebhook(): void {
    if (!confirm('Opravdu chcete smazat Telegram webhook?')) return;

    this.telegramService.deleteWebhook().subscribe({
      next: () => {
        this.successMessage.set('Telegram Webhook byl smazán.');
        this.loadTelegramStatus();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při mazání webhooku.');
      },
    });
  }

  loadTelegramMessages(): void {
    this.telegramService.getMessages({ limit: 50 }).subscribe({
      next: (res) => {
        this.telegramMessages.set(res.messages || []);
      },
    });
  }

  sendBroadcastNotification(): void {
    this.isSendingNotify.set(true);
    this.telegramService
      .sendDeploymentNotification({
        version: this.broadcastForm.version,
        releaseNotes: this.broadcastForm.releaseNotes,
      })
      .subscribe({
        next: (res) => {
          this.successMessage.set(`Deployment notifikace odeslána (${res.result?.sent || 0} zpráv).`);
          this.isSendingNotify.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Chyba při odesílání notifikace.');
          this.isSendingNotify.set(false);
        },
      });
  }

  loadOpenAiData(): void {
    this.openAiService.getUsage().subscribe({
      next: (res) => {
        this.openAiUsage.set(res.usage);
      },
    });
    this.loadOpenAiLogs();
  }

  loadOpenAiLogs(): void {
    this.openAiService.getMessages({ limit: 50 }).subscribe({
      next: (res) => {
        this.openAiLogs.set(res.messages || []);
      },
    });
  }

  clearOpenAiLogs(): void {
    if (!confirm('Opravdu chcete vymazat historii OpenAI logů?')) return;

    this.openAiService.clearMessages().subscribe({
      next: () => {
        this.successMessage.set('Historie OpenAI logů byla smazána.');
        this.loadOpenAiLogs();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Chyba při mazání OpenAI logů.');
      },
    });
  }

  runPlaygroundTest(): void {
    if (!this.playgroundPrompt) return;

    this.isRunningPlayground.set(true);
    this.playgroundResponse.set(null);

    this.openAiService
      .testPrompt({
        prompt: this.playgroundPrompt,
        systemPrompt: this.playgroundSystemPrompt || undefined,
      })
      .subscribe({
        next: (res) => {
          this.playgroundResponse.set(res.completion);
          this.isRunningPlayground.set(false);
          this.loadOpenAiData();
        },
        error: (err) => {
          this.playgroundResponse.set(`Chyba: ${err.message || 'Test selhal'}`);
          this.isRunningPlayground.set(false);
        },
      });
  }
}
