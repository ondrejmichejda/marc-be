import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { WishListService } from '../../core/services/wish-list.service';
import {
  WishItem,
  WaitingPeriod,
  WAITING_PERIOD_OPTIONS,
  WishesSummary,
  CreateWishInput,
  UpdateWishInput,
} from '../../core/models/wish-list.models';

@Component({
  selector: 'app-wish-list',
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
    MatRippleModule,
  ],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <mat-icon class="!text-purple-500">card_giftcard</mat-icon>
            <span>Wish List</span>
          </h1>
          <p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track and manage wishes with waiting periods (1 week, 2 weeks, 1 month), created date metadata, and target counters.
          </p>
        </div>

        <div class="flex items-center gap-2.5 sm:gap-3">
          <button
            mat-stroked-button
            type="button"
            (click)="loadWishes()"
            [disabled]="loading()"
            class="!rounded-xl !text-xs sm:!text-sm"
          >
            <mat-icon class="!text-base !w-4 !h-4 !mr-1" [class.animate-spin]="loading()">refresh</mat-icon>
            <span>Refresh</span>
          </button>
          <button
            mat-flat-button
            color="primary"
            type="button"
            (click)="openCreateModal()"
            class="!rounded-xl !text-xs sm:!text-sm !font-medium"
          >
            <mat-icon class="!text-base !w-4 !h-4 !mr-1">add</mat-icon>
            <span>New Wish</span>
          </button>
        </div>
      </div>

      <!-- Feedback Messages -->
      @if (successMessage()) {
        <div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <span class="flex items-center gap-1.5"><mat-icon class="!text-sm !w-4 !h-4 text-emerald-600 dark:text-emerald-400">check_circle</mat-icon> {{ successMessage() }}</span>
          <button type="button" (click)="successMessage.set(null)" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-white cursor-pointer"><mat-icon class="!text-sm !w-4 !h-4">close</mat-icon></button>
        </div>
      }
      @if (errorMessage()) {
        <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between animate-in fade-in">
          <span class="flex items-center gap-1.5"><mat-icon class="!text-sm !w-4 !h-4 text-rose-600 dark:text-rose-400">error</mat-icon> {{ errorMessage() }}</span>
          <button type="button" (click)="errorMessage.set(null)" class="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-white cursor-pointer"><mat-icon class="!text-sm !w-4 !h-4">close</mat-icon></button>
        </div>
      }

      <!-- Stats Overview Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-xs dark:shadow-none">
          <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
            <span>Total Wishes</span>
            <mat-icon class="!text-base !w-4 !h-4 text-zinc-400">card_giftcard</mat-icon>
          </div>
          <p class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mt-1">{{ summary().total }}</p>
        </div>

        <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-xs dark:shadow-none">
          <div class="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-medium">
            <span>Waiting</span>
            <mat-icon class="!text-base !w-4 !h-4">hourglass_top</mat-icon>
          </div>
          <p class="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{{ summary().waiting }}</p>
        </div>

        <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-xs dark:shadow-none">
          <div class="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <span>Period Passed</span>
            <mat-icon class="!text-base !w-4 !h-4">verified</mat-icon>
          </div>
          <p class="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{{ summary().ready }}</p>
        </div>

        <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-xs dark:shadow-none">
          <div class="flex items-center justify-between text-purple-600 dark:text-purple-400 text-xs font-medium">
            <span>Target Reached</span>
            <mat-icon class="!text-base !w-4 !h-4">emoji_events</mat-icon>
          </div>
          <p class="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{{ summary().completed }}</p>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-xs dark:shadow-none">
        <div class="relative flex-1 max-w-md">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Search wishes by name or description..."
            class="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
          <mat-icon class="!text-zinc-400 dark:!text-zinc-500 !text-sm !w-4 !h-4 absolute left-3 top-2.5">search</mat-icon>
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            matRipple
            type="button"
            (click)="setFilter('all')"
            [class]="statusFilter() === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'"
            class="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
          >
            All ({{ summary().total }})
          </button>
          <button
            matRipple
            type="button"
            (click)="setFilter('waiting')"
            [class]="statusFilter() === 'waiting' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'"
            class="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
          >
            Waiting ({{ summary().waiting }})
          </button>
          <button
            matRipple
            type="button"
            (click)="setFilter('ready')"
            [class]="statusFilter() === 'ready' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'"
            class="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
          >
            Period Passed ({{ summary().ready }})
          </button>
          <button
            matRipple
            type="button"
            (click)="setFilter('completed')"
            [class]="statusFilter() === 'completed' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'"
            class="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
          >
            Target Reached ({{ summary().completed }})
          </button>
        </div>
      </div>

      <!-- Loading Spinner -->
      @if (loading() && wishes().length === 0) {
        <div class="py-16 text-center text-zinc-500 dark:text-zinc-400 text-sm flex flex-col items-center justify-center gap-3">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Loading wish list...</span>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && wishes().length === 0) {
        <div class="py-16 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-400 space-y-3 shadow-xs dark:shadow-none">
          <mat-icon class="!text-4xl !w-10 !h-10 text-purple-500 mx-auto">card_giftcard</mat-icon>
          <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-300">No wishes found</p>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            {{ searchQuery ? 'No wishes match your search query.' : 'Create your first wish to track waiting periods and counter goals.' }}
          </p>
          @if (!searchQuery) {
            <button
              mat-flat-button
              color="primary"
              type="button"
              (click)="openCreateModal()"
              class="!rounded-xl !text-xs !font-semibold"
            >
              <mat-icon class="!text-sm !w-4 !h-4 !mr-1">add</mat-icon>
              <span>Create First Wish</span>
            </button>
          }
        </div>
      }

      <!-- Wishes Grid -->
      @if (wishes().length > 0) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (wish of wishes(); track wish.id) {
            <mat-card
              class="flex flex-col justify-between !p-5 !rounded-2xl !bg-white dark:!bg-zinc-900/80 !border !border-zinc-200 dark:!border-zinc-800 hover:!border-zinc-300 dark:hover:!border-zinc-700 transition-all !shadow-sm dark:!shadow-lg space-y-4 group relative overflow-hidden"
            >
              <!-- Top Header: Title & Badges -->
              <div class="space-y-2">
                <div class="flex items-start justify-between gap-3">
                  <h3 class="text-base font-bold text-zinc-900 dark:text-white leading-snug line-clamp-2">
                    {{ wish.name }}
                  </h3>

                  <!-- Waiting Period Status Badge -->
                  <span
                    [class]="wish.isPeriodCompleted
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'"
                    class="px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 shrink-0"
                  >
                    <mat-icon class="!text-xs !w-3.5 !h-3.5">
                      {{ wish.isPeriodCompleted ? 'verified' : 'hourglass_top' }}
                    </mat-icon>
                    <span>{{ getWaitingPeriodLabel(wish.waitingPeriod) }}</span>
                  </span>
                </div>

                @if (wish.description) {
                  <p class="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-3 leading-relaxed">
                    {{ wish.description }}
                  </p>
                }
              </div>

              <!-- Metadata & Waiting Progress -->
              <div class="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                <!-- Created Date Metadata -->
                <div class="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span class="flex items-center gap-1">
                    <mat-icon class="!text-xs !w-3.5 !h-3.5 text-zinc-400">calendar_today</mat-icon>
                    <span>Created:</span>
                  </span>
                  <span class="font-medium text-zinc-700 dark:text-zinc-300">
                    {{ formatDate(wish.createdAt) }}
                  </span>
                </div>

                <!-- Waiting Time Status -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <mat-icon class="!text-xs !w-3.5 !h-3.5 text-zinc-400">schedule</mat-icon>
                      <span>Waiting Period ({{ getWaitingPeriodLabel(wish.waitingPeriod) }}):</span>
                    </span>
                    <span
                      class="font-semibold"
                      [class.text-emerald-600]="wish.isPeriodCompleted"
                      [class.dark:text-emerald-400]="wish.isPeriodCompleted"
                      [class.text-amber-600]="!wish.isPeriodCompleted"
                      [class.dark:text-amber-400]="!wish.isPeriodCompleted"
                    >
                      @if (wish.isPeriodCompleted) {
                        Period passed
                      } @else {
                        {{ wish.daysRemaining }} day{{ wish.daysRemaining === 1 ? '' : 's' }} left
                      }
                    </span>
                  </div>

                  <!-- Period Progress Bar -->
                  <div class="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      class="h-full transition-all duration-300 rounded-full"
                      [class.bg-emerald-500]="wish.isPeriodCompleted"
                      [class.bg-amber-500]="!wish.isPeriodCompleted"
                      [style.width.%]="wish.periodProgressPercentage || 0"
                    ></div>
                  </div>
                </div>

                <!-- Counter Section -->
                <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      <mat-icon class="!text-sm !w-4 !h-4 text-purple-500">add_circle</mat-icon>
                      <span>Counter:</span>
                    </div>
                    <div class="flex items-center gap-1 text-xs">
                      <span class="text-base font-bold text-purple-600 dark:text-purple-400">{{ wish.counter }}</span>
                      <span class="text-zinc-400">/</span>
                      <span class="font-medium text-zinc-600 dark:text-zinc-300">{{ wish.maxCounter }}</span>
                      @if (wish.isCounterReached) {
                        <span class="ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          MAX
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Counter Progress Bar -->
                  <div class="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-purple-600 dark:bg-purple-500 transition-all duration-300 rounded-full"
                      [style.width.%]="wish.counterProgressPercentage || 0"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Footer Actions: Increment +1, Edit, Delete -->
              <div class="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                <button
                  mat-icon-button
                  type="button"
                  (click)="incrementCounter(wish)"
                  [disabled]="actionInProgress() === wish.id"
                  class="!text-purple-600 dark:!text-purple-400 hover:!text-purple-700 dark:hover:!text-purple-300"
                  matTooltip="Increase counter +1"
                >
                  @if (actionInProgress() === wish.id) {
                    <mat-spinner diameter="18"></mat-spinner>
                  } @else {
                    <mat-icon>exposure_plus_1</mat-icon>
                  }
                </button>

                <div class="flex items-center gap-1">
                  <button
                    mat-icon-button
                    type="button"
                    (click)="openEditModal(wish)"
                    class="!text-zinc-500 dark:!text-zinc-400 hover:!text-zinc-900 dark:hover:!text-white"
                    matTooltip="Edit wish and maximum counter"
                  >
                    <mat-icon class="!text-base !w-4 !h-4">edit</mat-icon>
                  </button>

                  <button
                    mat-icon-button
                    type="button"
                    (click)="openDeleteConfirm(wish)"
                    class="!text-rose-500 hover:!text-rose-700"
                    matTooltip="Delete wish"
                  >
                    <mat-icon class="!text-base !w-4 !h-4">delete_outline</mat-icon>
                  </button>
                </div>
              </div>
            </mat-card>
          }
        </div>
      }

      <!-- Create / Edit Wish Modal -->
      @if (modalOpen()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 md:p-6 animate-in fade-in">
          <mat-card
            class="relative w-full max-w-lg !bg-white dark:!bg-zinc-900 !border !border-zinc-200 dark:!border-zinc-800 !rounded-t-3xl sm:!rounded-2xl !shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[92vh] !p-0"
            (click)="$event.stopPropagation()"
          >
            <!-- Modal Header -->
            <div class="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/80 dark:bg-zinc-900/90 shrink-0">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="p-2 rounded-xl bg-purple-50 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 text-lg flex items-center justify-center border border-purple-100 dark:border-purple-500/20 shrink-0">
                  <mat-icon class="!text-purple-500">{{ editingWish() ? 'edit' : 'card_giftcard' }}</mat-icon>
                </div>
                <div class="min-w-0">
                  <h2 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                    {{ editingWish() ? 'Edit Wish' : 'Create New Wish' }}
                  </h2>
                  <p class="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate hidden xs:block">Waiting period and counter goals</p>
                </div>
              </div>
              <button
                type="button"
                (click)="closeModal()"
                class="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
              >
                <mat-icon class="!text-base !w-4 !h-4">close</mat-icon>
              </button>
            </div>

            <!-- Modal Body / Form -->
            <div class="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <!-- Name Input -->
              <div class="space-y-1.5">
                <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Wish Name <span class="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  [(ngModel)]="formData.name"
                  placeholder="e.g. Ergonomic Office Chair, Learn Rust"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <!-- Description Input -->
              <div class="space-y-1.5">
                <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Description
                </label>
                <textarea
                  [(ngModel)]="formData.description"
                  rows="3"
                  placeholder="Details, specifications, reasons or motivation for this wish..."
                  class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
                ></textarea>
              </div>

              <!-- Waiting Period Selector -->
              <div class="space-y-1.5">
                <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Time Period to Wait <span class="text-rose-500">*</span>
                </label>
                <div class="grid grid-cols-3 gap-2">
                  @for (option of waitingPeriodOptions; track option.value) {
                    <button
                      type="button"
                      (click)="formData.waitingPeriod = option.value"
                      [class]="formData.waitingPeriod === option.value
                        ? 'bg-purple-600 text-white border-purple-600 font-semibold shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'"
                      class="px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl border text-xs text-center flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer"
                    >
                      <span class="font-medium text-[11px] sm:text-xs">{{ option.label }}</span>
                      <span class="text-[9px] sm:text-[10px] opacity-80">{{ option.days }} days</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Counter & Max Counter Grid -->
              <div class="grid grid-cols-2 gap-3 pt-2">
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Current Counter
                  </label>
                  <input
                    type="number"
                    min="0"
                    [(ngModel)]="formData.counter"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p class="text-[10px] text-zinc-400">Current progress value</p>
                </div>

                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Editable Maximum <span class="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    [(ngModel)]="formData.maxCounter"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p class="text-[10px] text-zinc-400">Target maximum goal</p>
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/90 flex items-center justify-end gap-2.5 shrink-0">
              <button
                mat-stroked-button
                type="button"
                (click)="closeModal()"
                [disabled]="submitting()"
                class="!rounded-xl !text-xs"
              >
                Cancel
              </button>
              <button
                mat-flat-button
                color="primary"
                type="button"
                (click)="saveWish()"
                [disabled]="submitting() || !formData.name.trim()"
                class="!rounded-xl !text-xs !font-semibold"
              >
                @if (submitting()) {
                  <span class="flex items-center gap-1.5">
                    <mat-spinner diameter="14"></mat-spinner>
                    <span>Saving...</span>
                  </span>
                } @else {
                  <span>{{ editingWish() ? 'Update Wish' : 'Create Wish' }}</span>
                }
              </button>
            </div>
          </mat-card>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (deletingWish()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in">
          <mat-card
            class="relative w-full max-w-sm !bg-white dark:!bg-zinc-900 !border !border-zinc-200 dark:!border-zinc-800 !rounded-2xl !shadow-2xl overflow-hidden !p-6 space-y-4"
            (click)="$event.stopPropagation()"
          >
            <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <mat-icon class="!text-2xl !w-6 !h-6">delete_forever</mat-icon>
            </div>

            <div class="text-center space-y-1">
              <h3 class="text-sm font-bold text-zinc-900 dark:text-white">Delete Wish?</h3>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">
                Are you sure you want to delete <span class="font-semibold text-zinc-800 dark:text-zinc-200">"{{ deletingWish()?.name }}"</span>? This action cannot be undone.
              </p>
            </div>

            <div class="flex items-center justify-center gap-2.5 pt-2">
              <button
                mat-stroked-button
                type="button"
                (click)="deletingWish.set(null)"
                [disabled]="submitting()"
                class="!rounded-xl !text-xs flex-1"
              >
                Cancel
              </button>
              <button
                mat-flat-button
                color="warn"
                type="button"
                (click)="confirmDelete()"
                [disabled]="submitting()"
                class="!rounded-xl !text-xs !font-semibold flex-1 !bg-rose-600 hover:!bg-rose-700 text-white"
              >
                @if (submitting()) {
                  <span class="flex items-center justify-center gap-1.5">
                    <mat-spinner diameter="14"></mat-spinner>
                    <span>Deleting...</span>
                  </span>
                } @else {
                  <span>Delete</span>
                }
              </button>
            </div>
          </mat-card>
        </div>
      }
    </div>
  `,
})
export class WishListComponent implements OnInit {
  private wishService = inject(WishListService);

  readonly waitingPeriodOptions = WAITING_PERIOD_OPTIONS;

  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  actionInProgress = signal<string | null>(null);

  wishes = signal<WishItem[]>([]);
  summary = signal<WishesSummary>({ total: 0, waiting: 0, ready: 0, completed: 0 });

  statusFilter = signal<string>('all');
  searchQuery = '';

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  modalOpen = signal<boolean>(false);
  editingWish = signal<WishItem | null>(null);
  deletingWish = signal<WishItem | null>(null);

  formData = {
    name: '',
    description: '',
    waitingPeriod: '1week' as WaitingPeriod,
    counter: 0,
    maxCounter: 5,
  };

  ngOnInit(): void {
    this.loadWishes();
  }

  loadWishes(): void {
    this.loading.set(true);
    this.wishService
      .getWishes({
        search: this.searchQuery || undefined,
        status: this.statusFilter(),
      })
      .subscribe({
        next: (res) => {
          this.wishes.set(res.wishes || []);
          this.summary.set(res.summary || { total: 0, waiting: 0, ready: 0, completed: 0 });
          this.loading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.error || 'Failed to load wish list.');
          this.loading.set(false);
        },
      });
  }

  onSearchChange(): void {
    this.loadWishes();
  }

  setFilter(status: string): void {
    this.statusFilter.set(status);
    this.loadWishes();
  }

  getWaitingPeriodLabel(period: WaitingPeriod): string {
    const match = this.waitingPeriodOptions.find((opt) => opt.value === period);
    return match ? match.label : '1 week';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  openCreateModal(): void {
    this.editingWish.set(null);
    this.formData = {
      name: '',
      description: '',
      waitingPeriod: '1week',
      counter: 0,
      maxCounter: 5,
    };
    this.modalOpen.set(true);
  }

  openEditModal(wish: WishItem): void {
    this.editingWish.set(wish);
    this.formData = {
      name: wish.name,
      description: wish.description || '',
      waitingPeriod: wish.waitingPeriod,
      counter: wish.counter,
      maxCounter: wish.maxCounter,
    };
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingWish.set(null);
  }

  saveWish(): void {
    const name = this.formData.name.trim();
    if (!name) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    const wishToEdit = this.editingWish();
    if (wishToEdit) {
      const input: UpdateWishInput = {
        name,
        description: this.formData.description.trim(),
        waitingPeriod: this.formData.waitingPeriod,
        counter: Math.max(0, Number(this.formData.counter) || 0),
        maxCounter: Math.max(1, Number(this.formData.maxCounter) || 1),
      };

      this.wishService.updateWish(wishToEdit.id, input).subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.closeModal();
          this.successMessage.set(`Wish '${res.wish.name}' updated successfully.`);
          this.loadWishes();
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(err?.error?.error || 'Failed to update wish.');
        },
      });
    } else {
      const input: CreateWishInput = {
        name,
        description: this.formData.description.trim(),
        waitingPeriod: this.formData.waitingPeriod,
        counter: Math.max(0, Number(this.formData.counter) || 0),
        maxCounter: Math.max(1, Number(this.formData.maxCounter) || 5),
      };

      this.wishService.createWish(input).subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.closeModal();
          this.successMessage.set(`Wish '${res.wish.name}' created successfully.`);
          this.loadWishes();
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(err?.error?.error || 'Failed to create wish.');
        },
      });
    }
  }

  incrementCounter(wish: WishItem): void {
    this.actionInProgress.set(wish.id);
    this.errorMessage.set(null);

    this.wishService.incrementCounter(wish.id, 1).subscribe({
      next: (res) => {
        this.actionInProgress.set(null);
        // Update local item
        this.wishes.update((list) =>
          list.map((item) => (item.id === res.wish.id ? res.wish : item))
        );
        this.successMessage.set(
          `Counter for '${res.wish.name}' increased to ${res.wish.counter} / ${res.wish.maxCounter}.`
        );
      },
      error: (err) => {
        this.actionInProgress.set(null);
        this.errorMessage.set(err?.error?.error || 'Failed to increment counter.');
      },
    });
  }

  openDeleteConfirm(wish: WishItem): void {
    this.deletingWish.set(wish);
  }

  confirmDelete(): void {
    const wish = this.deletingWish();
    if (!wish) return;

    this.submitting.set(true);
    this.wishService.deleteWish(wish.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.deletingWish.set(null);
        this.successMessage.set(`Wish '${wish.name}' deleted successfully.`);
        this.loadWishes();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.error || 'Failed to delete wish.');
      },
    });
  }
}
