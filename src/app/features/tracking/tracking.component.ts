import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
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
import { TrackingService } from '../../core/services/tracking.service';
import {
  TrackedItem,
  TrackerResetLog,
  TrackersSummary,
} from '../../core/models/tracking.models';

interface QuickDurationPreset {
  label: string;
  days: number;
  hours: number;
  minutes: number;
}

const DURATION_PRESETS: QuickDurationPreset[] = [
  { label: '15 min', days: 0, hours: 0, minutes: 15 },
  { label: '1 hour', days: 0, hours: 1, minutes: 0 },
  { label: '4 hours', days: 0, hours: 4, minutes: 0 },
  { label: '12 hours', days: 0, hours: 12, minutes: 0 },
  { label: '1 day', days: 1, hours: 0, minutes: 0 },
  { label: '3 days', days: 3, hours: 0, minutes: 0 },
  { label: '7 days', days: 7, hours: 0, minutes: 0 },
  { label: '30 days', days: 30, hours: 0, minutes: 0 },
];

@Component({
  selector: 'app-tracking',
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
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <mat-icon class="!text-emerald-500">timer</mat-icon>
            <span>Tracking</span>
          </h1>
          <p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Personal duration trackers with solid progress visualizers, dynamic status colors, overflow tracking, and reset audit logs.
          </p>
        </div>

        <div class="flex items-center gap-2.5 sm:gap-3">
          <button
            mat-stroked-button
            type="button"
            (click)="loadTrackers()"
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
            <span>New Tracker</span>
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
            <span>Total Trackers</span>
            <mat-icon class="!text-base !w-4 !h-4 text-zinc-400">inventory_2</mat-icon>
          </div>
          <div class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {{ summary()?.total ?? trackers().length }}
          </div>
          <div class="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Personal isolated items</div>
        </div>

        <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-xs dark:shadow-none">
          <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
            <span>In Progress</span>
            <mat-icon class="!text-base !w-4 !h-4 text-amber-500">timelapse</mat-icon>
          </div>
          <div class="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {{ summary()?.active ?? 0 }}
          </div>
          <div class="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Passing duration</div>
        </div>

        <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-xs dark:shadow-none">
          <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
            <span>Completed</span>
            <mat-icon class="!text-base !w-4 !h-4 text-emerald-500">task_alt</mat-icon>
          </div>
          <div class="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {{ summary()?.completed ?? 0 }}
          </div>
          <div class="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Reached target time</div>
        </div>

        <div class="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-xs dark:shadow-none">
          <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
            <span>Total Resets</span>
            <mat-icon class="!text-base !w-4 !h-4 text-indigo-500">history</mat-icon>
          </div>
          <div class="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {{ summary()?.totalResets ?? 0 }}
          </div>
          <div class="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Logged reset actions</div>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-xs dark:shadow-none">
        <div class="relative flex-1 max-w-md">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Search trackers by title or description..."
            class="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
          <mat-icon class="!text-zinc-400 dark:!text-zinc-500 !text-sm !w-4 !h-4 absolute left-3 top-2.5">search</mat-icon>
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            matRipple
            type="button"
            (click)="setStatusFilter('all')"
            class="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
            [class]="selectedStatus() === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'"
          >
            All ({{ trackers().length }})
          </button>
          <button
            matRipple
            type="button"
            (click)="setStatusFilter('active')"
            class="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
            [class]="selectedStatus() === 'active' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'"
          >
            In Progress ({{ summary()?.active ?? 0 }})
          </button>
          <button
            matRipple
            type="button"
            (click)="setStatusFilter('completed')"
            class="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
            [class]="selectedStatus() === 'completed' ? 'bg-indigo-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'"
          >
            Completed ({{ summary()?.completed ?? 0 }})
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading() && trackers().length === 0) {
        <div class="py-16 text-center text-zinc-500 dark:text-zinc-400 text-sm flex flex-col items-center justify-center gap-3">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Loading trackers...</span>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && filteredTrackers().length === 0) {
        <div class="py-16 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-400 space-y-3 shadow-xs dark:shadow-none">
          <mat-icon class="!text-4xl !w-10 !h-10 text-emerald-500 mx-auto">timer</mat-icon>
          <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-300">
            @if (searchQuery) { No trackers match your search } @else { No tracked items yet }
          </p>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            @if (searchQuery) { Try adjusting your search term or clear the filter. } @else { Create your first duration tracker with customizable days, hours, minutes, solid progress bar, and dynamic status color visualization. }
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
              <span>Create Tracked Item</span>
            </button>
          }
        </div>
      }

      <!-- Trackers Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        @for (item of filteredTrackers(); track item.id) {
          <mat-card class="flex flex-col justify-between !p-5 !rounded-2xl !bg-white dark:!bg-zinc-900/80 !border !border-zinc-200 dark:!border-zinc-800 hover:!border-zinc-300 dark:hover:!border-zinc-700 transition-all !shadow-sm dark:!shadow-lg space-y-4 group">
            <div>
              <!-- Top Row: Name, Badges, Options -->
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-semibold text-zinc-900 dark:text-white truncate" [title]="item.name">
                      {{ item.name }}
                    </h3>
                    @if (item.notifyTelegram) {
                      <span
                        class="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-500 border border-sky-500/20 flex items-center gap-0.5 shrink-0"
                        matTooltip="Telegram notifications enabled"
                      >
                        <mat-icon class="!text-[12px] !w-3 !h-3">send</mat-icon>
                        <span>Telegram</span>
                      </span>
                    }
                  </div>
                  <div class="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 flex items-center gap-2">
                    <span>Target: {{ formatDuration(item.durationDays, item.durationHours, item.durationMinutes) }}</span>
                    <span>•</span>
                    <span>Started: {{ item.lastResetAt | date:'short' }}</span>
                  </div>
                </div>

                <!-- Status Badge with Dynamic Gradient Status Color -->
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 border transition-all"
                  [style.color]="getStatusColor(getTrackerMetrics(item).progressPercentage)"
                  [style.backgroundColor]="getStatusBgColor(getTrackerMetrics(item).progressPercentage)"
                  [style.borderColor]="getStatusBorderColor(getTrackerMetrics(item).progressPercentage)"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    [style.backgroundColor]="getStatusColor(getTrackerMetrics(item).progressPercentage)"
                    [class.animate-pulse]="!getTrackerMetrics(item).isCompleted"
                  ></span>
                  <span>{{ getTrackerMetrics(item).isCompleted ? 'Completed' : 'In Progress' }}</span>
                </span>
              </div>

              <!-- Progress Bar & Overflow Information -->
              <div class="my-4 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <!-- Time Overflow instead of elapsed time -->
                  <div class="font-medium flex items-center gap-1">
                    @if (getTrackerMetrics(item).overflowSeconds > 0) {
                      <span class="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
                        <mat-icon class="!text-[14px] !w-3.5 !h-3.5">alarm_on</mat-icon>
                        <span>Overflow: +{{ getOverflowFormatted(item) }}</span>
                      </span>
                    } @else {
                      <span class="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <mat-icon class="!text-[14px] !w-3.5 !h-3.5 text-zinc-400">schedule</mat-icon>
                        <span>Overflow: 0s</span>
                      </span>
                    }
                  </div>

                  <!-- Status Percentage with Gradient Status Color -->
                  <div class="flex items-center gap-1.5 text-xs font-bold" [style.color]="getStatusColor(getTrackerMetrics(item).progressPercentage)">
                    <span class="w-2 h-2 rounded-full" [style.backgroundColor]="getStatusColor(getTrackerMetrics(item).progressPercentage)"></span>
                    <span>Status: {{ getTrackerMetrics(item).progressPercentage }}%</span>
                  </div>
                </div>

                <!-- Static Solid Color Progress Bar -->
                <div class="relative w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden p-0.5 border border-zinc-200/60 dark:border-zinc-700/60">
                  <div
                    class="h-full rounded-full transition-all duration-300 relative bg-indigo-600 dark:bg-indigo-500 shadow-xs"
                    [style.width.%]="getTrackerMetrics(item).progressPercentage"
                  >
                    <!-- Subdued highlight sheen -->
                    <div class="absolute inset-0 bg-white/15 rounded-full"></div>
                  </div>
                </div>

                <div class="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-0.5">
                  <span class="font-medium text-zinc-600 dark:text-zinc-400">
                    @if (getTrackerMetrics(item).isCompleted) {
                      <span class="text-emerald-500 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <mat-icon class="!text-[12px] !w-3 !h-3">check_circle</mat-icon>
                        Target reached
                      </span>
                    } @else {
                      <span>{{ getRemainingFormatted(item) }} remaining</span>
                    }
                  </span>
                  <span class="flex items-center gap-1.5 text-[11px]" [style.color]="getStatusColor(getTrackerMetrics(item).progressPercentage)">
                    <span class="w-1.5 h-1.5 rounded-full" [style.backgroundColor]="getStatusColor(getTrackerMetrics(item).progressPercentage)"></span>
                    <span class="font-medium">{{ getStatusLabel(getTrackerMetrics(item).progressPercentage) }}</span>
                  </span>
                </div>
              </div>

              <!-- Reset Log Count & Preview -->
              <div class="pt-2 pb-1 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                <button
                  type="button"
                  (click)="openResetsModal(item)"
                  class="text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <mat-icon class="!text-[14px] !w-3.5 !h-3.5 text-indigo-500">history</mat-icon>
                  <span>Reset History ({{ item.resetsCount || 0 }})</span>
                </button>

                @if (item.notifyTelegram) {
                  <span class="text-[11px] text-sky-600 dark:text-sky-400 flex items-center gap-1">
                    <mat-icon class="!text-[12px] !w-3 !h-3">notifications_active</mat-icon>
                    <span>Telegram Alerts On</span>
                  </span>
                }
              </div>
            </div>

            <!-- Action Buttons Footer -->
            <div class="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <button
                mat-icon-button
                type="button"
                (click)="openResetConfirmModal(item)"
                [disabled]="resettingId() === item.id"
                class="!text-amber-600 dark:!text-amber-400 hover:!text-amber-700 dark:hover:!text-amber-300"
                matTooltip="Reset tracker"
              >
                @if (resettingId() === item.id) {
                  <mat-spinner diameter="18"></mat-spinner>
                } @else {
                  <mat-icon>restart_alt</mat-icon>
                }
              </button>

              <div class="flex items-center gap-1">
                <button
                  mat-icon-button
                  type="button"
                  (click)="openEditModal(item)"
                  class="!text-zinc-500 dark:!text-zinc-400 hover:!text-indigo-600 dark:hover:!text-indigo-400"
                  matTooltip="Edit Tracker"
                >
                  <mat-icon>edit</mat-icon>
                </button>
                <button
                  mat-icon-button
                  type="button"
                  (click)="confirmDelete(item)"
                  class="!text-zinc-400 dark:!text-zinc-500 hover:!text-rose-600 dark:hover:!text-rose-400"
                  matTooltip="Delete Tracker"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          </mat-card>
        }
      </div>

      <!-- Create / Edit Modal -->
      @if (showFormModal()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 md:p-6 animate-in fade-in">
          <mat-card
            class="relative w-full max-w-lg !bg-white dark:!bg-zinc-900 !border !border-zinc-200 dark:border-zinc-800 !rounded-t-3xl sm:!rounded-2xl !shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[92vh] !p-0"
            (click)="$event.stopPropagation()"
          >
            <!-- Modal Header -->
            <div class="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/80 dark:bg-zinc-900/90 shrink-0">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 text-lg flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 shrink-0">
                  <mat-icon class="!text-emerald-500">{{ isEditing() ? 'edit' : 'add_task' }}</mat-icon>
                </div>
                <div class="min-w-0">
                  <h2 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                    {{ isEditing() ? 'Edit Tracked Item' : 'New Tracked Item' }}
                  </h2>
                  <p class="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate hidden xs:block">Duration settings and alert configuration</p>
                </div>
              </div>
              <button
                type="button"
                (click)="closeFormModal()"
                class="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
              >
                <mat-icon class="!text-base !w-4 !h-4">close</mat-icon>
              </button>
            </div>

            <form (ngSubmit)="saveTracker()" class="flex flex-col flex-1 overflow-hidden m-0">
              <!-- Modal Body / Form -->
              <div class="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <!-- Name Input -->
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Tracker Name <span class="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="formData.name"
                    name="trackerName"
                    required
                    placeholder="e.g., HVAC Filter Replacement, BJJ Belt Streak, Plant Watering..."
                    class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <!-- Duration Configuration (Days, Hours, Minutes) -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Duration Setting <span class="text-rose-500">*</span>
                    </label>
                    <span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Total: {{ formatDuration(formData.durationDays, formData.durationHours, formData.durationMinutes) }}
                    </span>
                  </div>

                  <div class="grid grid-cols-3 gap-2 sm:gap-3">
                    <div>
                      <label class="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">Days</label>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        [(ngModel)]="formData.durationDays"
                        name="durationDays"
                        class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">Hours</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        [(ngModel)]="formData.durationHours"
                        name="durationHours"
                        class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">Minutes</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        [(ngModel)]="formData.durationMinutes"
                        name="durationMinutes"
                        class="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <!-- Quick Presets -->
                  <div class="pt-1">
                    <div class="text-[11px] text-zinc-400 dark:text-zinc-500 mb-1.5">Quick Presets:</div>
                    <div class="flex flex-wrap gap-1.5">
                      @for (preset of presets; track preset.label) {
                        <button
                          type="button"
                          (click)="applyPreset(preset)"
                          class="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                        >
                          {{ preset.label }}
                        </button>
                      }
                    </div>
                  </div>
                </div>

                <!-- Telegram Notification Option -->
                <div class="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 space-y-2">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <mat-icon class="!text-base !w-4 !h-4 text-sky-500">send</mat-icon>
                      <span class="text-xs font-semibold text-zinc-900 dark:text-white">Notify over Telegram</span>
                    </div>
                    <mat-slide-toggle [(ngModel)]="formData.notifyTelegram" name="notifyTelegram" color="primary"></mat-slide-toggle>
                  </div>
                  <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Receive Johan Bot Telegram alert via hourly scheduled check when this tracker completes its target duration.
                  </p>
                </div>
              </div>

              <!-- Modal Footer -->
              <div class="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/90 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  mat-stroked-button
                  type="button"
                  (click)="closeFormModal()"
                  class="!rounded-xl !text-xs"
                >
                  Cancel
                </button>
                <button
                  mat-flat-button
                  color="primary"
                  type="submit"
                  [disabled]="submitting() || !formData.name"
                  class="!rounded-xl !text-xs !font-semibold"
                >
                  @if (submitting()) {
                    <span class="flex items-center gap-1.5">
                      <mat-spinner diameter="14"></mat-spinner>
                      <span>Saving...</span>
                    </span>
                  } @else {
                    <span>{{ isEditing() ? 'Save Changes' : 'Create Tracker' }}</span>
                  }
                </button>
              </div>
            </form>
          </mat-card>
        </div>
      }

      <!-- Reset Confirmation Modal -->
      @if (resetConfirmItem()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 md:p-6 animate-in fade-in">
          <mat-card
            class="relative w-full max-w-md !bg-white dark:!bg-zinc-900 !border !border-zinc-200 dark:!border-zinc-800 !rounded-t-3xl sm:!rounded-2xl !shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[92vh] !p-0"
            (click)="$event.stopPropagation()"
          >
            <!-- Modal Header -->
            <div class="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/80 dark:bg-zinc-900/90 shrink-0">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="p-2 rounded-xl bg-amber-50 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 text-lg flex items-center justify-center border border-amber-100 dark:border-amber-500/20 shrink-0">
                  <mat-icon class="!text-amber-500">restart_alt</mat-icon>
                </div>
                <div class="min-w-0">
                  <h2 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">Reset Tracker Duration?</h2>
                  <p class="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate hidden xs:block">{{ resetConfirmItem()?.name }}</p>
                </div>
              </div>
              <button
                type="button"
                (click)="resetConfirmItem.set(null)"
                class="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
              >
                <mat-icon class="!text-base !w-4 !h-4">close</mat-icon>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 space-y-1.5">
                <div class="flex justify-between">
                  <span>Time overflow:</span>
                  <strong class="text-zinc-900 dark:text-white">
                    @if (getTrackerMetrics(resetConfirmItem()!).overflowSeconds > 0) {
                      <span class="text-rose-600 dark:text-rose-400 font-semibold">+{{ getOverflowFormatted(resetConfirmItem()!) }}</span>
                    } @else {
                      <span class="text-zinc-500 dark:text-zinc-400">0s (within target duration)</span>
                    }
                  </strong>
                </div>
                <div class="flex justify-between">
                  <span>Current progress:</span>
                  <strong class="text-zinc-900 dark:text-white">{{ getTrackerMetrics(resetConfirmItem()!).progressPercentage }}%</strong>
                </div>
                <div class="flex justify-between">
                  <span>Status:</span>
                  <span class="font-semibold flex items-center gap-1" [style.color]="getStatusColor(getTrackerMetrics(resetConfirmItem()!).progressPercentage)">
                    <span class="w-1.5 h-1.5 rounded-full" [style.backgroundColor]="getStatusColor(getTrackerMetrics(resetConfirmItem()!).progressPercentage)"></span>
                    {{ getStatusLabel(getTrackerMetrics(resetConfirmItem()!).progressPercentage) }}
                  </span>
                </div>
                <p class="text-[11px] text-zinc-400 dark:text-zinc-500 pt-1.5 border-t border-zinc-200/50 dark:border-zinc-800">
                  Resetting will reset the duration and overflow back to 0 and record an immutable entry in the reset history log.
                </p>
              </div>

              <div class="space-y-1.5">
                <label class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Optional Reset Note / Reason
                </label>
                <input
                  type="text"
                  [(ngModel)]="resetNote"
                  placeholder="e.g., Routine maintenance performed, Filter replaced, Watered..."
                  class="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/90 flex items-center justify-end gap-2.5 shrink-0">
              <button
                mat-stroked-button
                type="button"
                (click)="resetConfirmItem.set(null)"
                class="!rounded-xl !text-xs"
              >
                Cancel
              </button>
              <button
                mat-flat-button
                color="warn"
                type="button"
                (click)="executeReset()"
                [disabled]="resettingId() !== null"
                class="!rounded-xl !text-xs !font-semibold !bg-amber-600 hover:!bg-amber-700 text-white cursor-pointer"
              >
                @if (resettingId() !== null) {
                  <span class="flex items-center gap-1.5">
                    <mat-spinner diameter="14"></mat-spinner>
                    <span>Resetting...</span>
                  </span>
                } @else {
                  <span>Confirm Reset</span>
                }
              </button>
            </div>
          </mat-card>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (deleteConfirmItem()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-sm flex justify-center items-center p-4 animate-in fade-in">
          <mat-card
            class="relative w-full max-w-sm !bg-white dark:!bg-zinc-900 !border !border-zinc-200 dark:!border-zinc-800 !rounded-2xl !shadow-2xl overflow-hidden !p-6 space-y-4"
            (click)="$event.stopPropagation()"
          >
            <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
              <mat-icon class="!text-2xl !w-6 !h-6">delete_forever</mat-icon>
            </div>

            <div class="text-center space-y-1">
              <h3 class="text-sm font-bold text-zinc-900 dark:text-white">Delete Tracked Item?</h3>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">
                This will permanently delete <span class="font-semibold text-zinc-800 dark:text-zinc-200">{{ deleteConfirmItem()?.name }}</span> and all its reset logs.
              </p>
            </div>

            <div class="flex items-center justify-center gap-2.5 pt-2">
              <button
                mat-stroked-button
                type="button"
                (click)="deleteConfirmItem.set(null)"
                class="!rounded-xl !text-xs flex-1"
              >
                Cancel
              </button>
              <button
                mat-flat-button
                color="warn"
                type="button"
                (click)="executeDelete()"
                [disabled]="deletingId() !== null"
                class="!rounded-xl !text-xs !font-semibold flex-1 !bg-rose-600 hover:!bg-rose-700 text-white"
              >
                @if (deletingId() !== null) {
                  <span class="flex items-center justify-center gap-1.5">
                    <mat-spinner diameter="14"></mat-spinner>
                    <span>Deleting...</span>
                  </span>
                } @else {
                  <span>Delete Tracker</span>
                }
              </button>
            </div>
          </mat-card>
        </div>
      }

      <!-- Reset Logs Modal -->
      @if (viewResetsItem()) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 md:p-6 animate-in fade-in">
          <mat-card
            class="relative w-full max-w-xl !bg-white dark:!bg-zinc-900 !border !border-zinc-200 dark:!border-zinc-800 !rounded-t-3xl sm:!rounded-2xl !shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh] !p-0"
            (click)="$event.stopPropagation()"
          >
            <!-- Modal Header -->
            <div class="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/80 dark:bg-zinc-900/90 shrink-0">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 text-lg flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shrink-0">
                  <mat-icon class="!text-indigo-500">history</mat-icon>
                </div>
                <div class="min-w-0">
                  <h2 class="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">Reset History Logs</h2>
                  <p class="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate hidden xs:block">{{ viewResetsItem()?.name }}</p>
                </div>
              </div>
              <button
                type="button"
                (click)="viewResetsItem.set(null)"
                class="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
              >
                <mat-icon class="!text-base !w-4 !h-4">close</mat-icon>
              </button>
            </div>

            <!-- Resets List Content -->
            <div class="p-4 sm:p-6 flex-1 overflow-y-auto space-y-2.5">
              @if (loadingResets()) {
                <div class="py-8 flex flex-col items-center justify-center text-zinc-400">
                  <mat-spinner diameter="24"></mat-spinner>
                  <p class="text-xs mt-2">Loading reset history...</p>
                </div>
              } @else if (resetLogs().length === 0) {
                <div class="py-10 text-center text-zinc-400 text-xs">
                  <mat-icon class="!text-3xl !w-8 !h-8 mb-1 text-zinc-300 dark:text-zinc-600">history_toggle_off</mat-icon>
                  <p>No resets logged yet for this item.</p>
                  <p class="text-[11px] text-zinc-400 mt-0.5">Click the "Reset" button on the tracker to reset and log.</p>
                </div>
              } @else {
                @for (log of resetLogs(); track log.id; let idx = $index) {
                  <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/80 flex items-start justify-between gap-3 text-xs">
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          #{{ resetLogs().length - idx }}
                        </span>
                        <span class="font-semibold text-zinc-800 dark:text-zinc-200">
                          {{ log.resetAt | date:'medium' }}
                        </span>
                      </div>
                      <div class="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Running duration before reset: <strong class="text-zinc-700 dark:text-zinc-300">{{ formatSeconds(log.elapsedSeconds) }}</strong>
                      </div>
                      @if (log.note) {
                        <div class="text-[11px] text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800 italic">
                          "{{ log.note }}"
                        </div>
                      }
                    </div>
                    <span class="text-[10px] text-zinc-400 shrink-0">
                      {{ log.resetAt | date:'shortTime' }}
                    </span>
                  </div>
                }
              }
            </div>

            <div class="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/90 flex items-center justify-between shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Total recorded resets: <strong class="text-zinc-900 dark:text-white">{{ resetLogs().length }}</strong></span>
              <button
                mat-stroked-button
                type="button"
                (click)="viewResetsItem.set(null)"
                class="!rounded-xl !text-xs"
              >
                Close
              </button>
            </div>
          </mat-card>
        </div>
      }
    </div>
  `,
})
export class TrackingComponent implements OnInit, OnDestroy {
  private trackingService = inject(TrackingService);

  trackers = signal<TrackedItem[]>([]);
  summary = signal<TrackersSummary | null>(null);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  selectedStatus = signal<'all' | 'active' | 'completed'>('all');
  searchQuery = '';

  // Timer interval for real-time live clock ticking
  private timerInterval: any = null;
  currentTime = signal<number>(Date.now());

  // Modal states
  showFormModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId: string | null = null;

  formData = {
    name: '',
    durationDays: 0,
    durationHours: 1,
    durationMinutes: 0,
    notifyTelegram: false,
  };

  presets = DURATION_PRESETS;

  // Reset confirmation
  resetConfirmItem = signal<TrackedItem | null>(null);
  resetNote = '';
  resettingId = signal<string | null>(null);

  // Delete confirmation
  deleteConfirmItem = signal<TrackedItem | null>(null);
  deletingId = signal<string | null>(null);

  // Resets log view
  viewResetsItem = signal<TrackedItem | null>(null);
  resetLogs = signal<TrackerResetLog[]>([]);
  loadingResets = signal<boolean>(false);

  // Telegram test notification
  notifyingId = signal<string | null>(null);

  // Filtered trackers computation
  filteredTrackers = computed(() => {
    let list = this.trackers();
    const q = this.searchQuery.trim().toLowerCase();
    const status = this.selectedStatus();
    // Read currentTime to establish reactive dependency for continuous timer updates
    this.currentTime();

    if (q) {
      list = list.filter((item) => item.name.toLowerCase().includes(q));
    }

    if (status === 'active') {
      list = list.filter((item) => !this.getTrackerMetrics(item).isCompleted);
    } else if (status === 'completed') {
      list = list.filter((item) => this.getTrackerMetrics(item).isCompleted);
    }

    return list;
  });

  ngOnInit(): void {
    this.loadTrackers();
    // Live timer ticking every second
    this.timerInterval = setInterval(() => {
      this.currentTime.set(Date.now());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  loadTrackers(): void {
    this.loading.set(true);
    this.trackingService.getTrackers().subscribe({
      next: (res) => {
        this.trackers.set(res.trackers || []);
        this.summary.set(res.summary || null);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.error || 'Failed to load tracked items.');
        this.loading.set(false);
      },
    });
  }

  setStatusFilter(status: 'all' | 'active' | 'completed'): void {
    this.selectedStatus.set(status);
  }

  onSearchChange(): void {
    // reactive computed will update
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId = null;
    this.formData = {
      name: '',
      durationDays: 0,
      durationHours: 1,
      durationMinutes: 0,
      notifyTelegram: false,
    };
    this.showFormModal.set(true);
  }

  openEditModal(item: TrackedItem): void {
    this.isEditing.set(true);
    this.editingId = item.id;
    this.formData = {
      name: item.name,
      durationDays: item.durationDays,
      durationHours: item.durationHours,
      durationMinutes: item.durationMinutes,
      notifyTelegram: item.notifyTelegram,
    };
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  applyPreset(preset: QuickDurationPreset): void {
    this.formData.durationDays = preset.days;
    this.formData.durationHours = preset.hours;
    this.formData.durationMinutes = preset.minutes;
  }

  saveTracker(): void {
    if (!this.formData.name.trim()) return;
    const totalSec =
      this.formData.durationDays * 86400 +
      this.formData.durationHours * 3600 +
      this.formData.durationMinutes * 60;
    if (totalSec <= 0) {
      this.errorMessage.set('Please set a duration greater than 0.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    if (this.isEditing() && this.editingId) {
      this.trackingService
        .updateTracker(this.editingId, {
          name: this.formData.name,
          durationDays: this.formData.durationDays,
          durationHours: this.formData.durationHours,
          durationMinutes: this.formData.durationMinutes,
          notifyTelegram: this.formData.notifyTelegram,
        })
        .subscribe({
          next: () => {
            this.submitting.set(false);
            this.showFormModal.set(false);
            this.successMessage.set(`Tracked item '${this.formData.name}' updated.`);
            this.loadTrackers();
          },
          error: (err) => {
            this.submitting.set(false);
            this.errorMessage.set(err?.error?.error || 'Failed to update tracker.');
          },
        });
    } else {
      this.trackingService
        .createTracker({
          name: this.formData.name,
          durationDays: this.formData.durationDays,
          durationHours: this.formData.durationHours,
          durationMinutes: this.formData.durationMinutes,
          notifyTelegram: this.formData.notifyTelegram,
        })
        .subscribe({
          next: (res) => {
            this.submitting.set(false);
            this.showFormModal.set(false);
            this.successMessage.set(`Tracked item '${res.tracker.name}' created.`);
            this.loadTrackers();
          },
          error: (err) => {
            this.submitting.set(false);
            this.errorMessage.set(err?.error?.error || 'Failed to create tracker.');
          },
        });
    }
  }

  openResetConfirmModal(item: TrackedItem): void {
    this.resetConfirmItem.set(item);
    this.resetNote = '';
  }

  executeReset(): void {
    const item = this.resetConfirmItem();
    if (!item) return;

    this.resettingId.set(item.id);
    this.trackingService.resetTracker(item.id, this.resetNote).subscribe({
      next: (res) => {
        this.resettingId.set(null);
        this.resetConfirmItem.set(null);
        this.successMessage.set(`Tracker '${item.name}' duration reset successfully.`);
        this.loadTrackers();
      },
      error: (err) => {
        this.resettingId.set(null);
        this.errorMessage.set(err?.error?.error || 'Failed to reset tracker.');
      },
    });
  }

  confirmDelete(item: TrackedItem): void {
    this.deleteConfirmItem.set(item);
  }

  executeDelete(): void {
    const item = this.deleteConfirmItem();
    if (!item) return;

    this.deletingId.set(item.id);
    this.trackingService.deleteTracker(item.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.deleteConfirmItem.set(null);
        this.successMessage.set(`Tracked item '${item.name}' deleted.`);
        this.loadTrackers();
      },
      error: (err) => {
        this.deletingId.set(null);
        this.errorMessage.set(err?.error?.error || 'Failed to delete tracker.');
      },
    });
  }

  openResetsModal(item: TrackedItem): void {
    this.viewResetsItem.set(item);
    this.loadingResets.set(true);
    this.trackingService.getResetLogs(item.id).subscribe({
      next: (res) => {
        this.resetLogs.set(res.resets || []);
        this.loadingResets.set(false);
      },
      error: () => {
        this.resetLogs.set([]);
        this.loadingResets.set(false);
      },
    });
  }

  notifyTelegram(item: TrackedItem): void {
    this.notifyingId.set(item.id);
    this.trackingService.notifyTracker(item.id).subscribe({
      next: () => {
        this.notifyingId.set(null);
        this.successMessage.set(`Telegram notification sent for '${item.name}'.`);
      },
      error: (err) => {
        this.notifyingId.set(null);
        this.errorMessage.set(err?.error?.error || 'Failed to send Telegram notification.');
      },
    });
  }

  // Dynamic Metric Helpers (Live Ticking)
  getTrackerMetrics(item: TrackedItem): {
    elapsedSeconds: number;
    remainingSeconds: number;
    overflowSeconds: number;
    progressPercentage: number;
    isCompleted: boolean;
  } {
    const lastReset = new Date(item.lastResetAt).getTime();
    const now = this.currentTime();
    const elapsedSeconds = Math.max(0, Math.floor((now - lastReset) / 1000));
    const totalSec = Math.max(1, item.totalDurationSeconds);
    const remainingSeconds = Math.max(0, item.totalDurationSeconds - elapsedSeconds);
    const overflowSeconds = Math.max(0, elapsedSeconds - item.totalDurationSeconds);
    const rawProgress = (remainingSeconds / totalSec) * 100;
    const progressPercentage = Math.min(100, Math.max(0, Math.round(rawProgress * 10) / 10));
    const isCompleted = elapsedSeconds >= item.totalDurationSeconds;

    return {
      elapsedSeconds,
      remainingSeconds,
      overflowSeconds,
      progressPercentage,
      isCompleted,
    };
  }

  getOverflowFormatted(item: TrackedItem): string {
    const metrics = this.getTrackerMetrics(item);
    return this.formatSeconds(metrics.overflowSeconds);
  }

  getRemainingFormatted(item: TrackedItem): string {
    const metrics = this.getTrackerMetrics(item);
    return this.formatSeconds(metrics.remainingSeconds);
  }

  formatDuration(days: number, hours: number, minutes: number): string {
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    return parts.join(' ');
  }

  formatSeconds(totalSec: number): string {
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  }

  /**
   * Generates a status color along the red-to-green gradient.
   * 0% -> Red (#ef4444 / rgb(239, 68, 68))
   * 50% -> Amber (#f59e0b / rgb(245, 158, 11))
   * 100% -> Green (#10b981 / rgb(16, 185, 129))
   */
  getStatusColor(percentage: number): string {
    const p = Math.min(100, Math.max(0, percentage));
    let r: number, g: number, b: number;
    if (p <= 50) {
      const factor = p / 50;
      r = Math.round(239 + (245 - 239) * factor);
      g = Math.round(68 + (158 - 68) * factor);
      b = Math.round(68 + (11 - 68) * factor);
    } else {
      const factor = (p - 50) / 50;
      r = Math.round(245 + (16 - 245) * factor);
      g = Math.round(158 + (185 - 158) * factor);
      b = Math.round(11 + (129 - 11) * factor);
    }
    return `rgb(${r}, ${g}, ${b})`;
  }

  getStatusBgColor(percentage: number, opacity = 0.12): string {
    const p = Math.min(100, Math.max(0, percentage));
    let r: number, g: number, b: number;
    if (p <= 50) {
      const factor = p / 50;
      r = Math.round(239 + (245 - 239) * factor);
      g = Math.round(68 + (158 - 68) * factor);
      b = Math.round(68 + (11 - 68) * factor);
    } else {
      const factor = (p - 50) / 50;
      r = Math.round(245 + (16 - 245) * factor);
      g = Math.round(158 + (185 - 158) * factor);
      b = Math.round(11 + (129 - 11) * factor);
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  getStatusBorderColor(percentage: number, opacity = 0.3): string {
    return this.getStatusBgColor(percentage, opacity);
  }

  getStatusLabel(percentage: number): string {
    if (percentage >= 100) return 'Elapsed (100%)';
    if (percentage >= 75) return 'Nearly Done';
    if (percentage >= 40) return 'In Progress';
    return 'Just Started';
  }
}
