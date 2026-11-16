import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  UserTelegramConfigStatus,
  UserTelegramSettingsInput,
} from '../models/telegram.models';

@Injectable({
  providedIn: 'root',
})
export class TelegramSettingsService {
  private http = inject(HttpClient);

  getSettings(): Observable<{ success: boolean; config: UserTelegramConfigStatus }> {
    return this.http.get<{ success: boolean; config: UserTelegramConfigStatus }>(
      '/api/user/telegram-settings'
    );
  }

  saveSettings(
    settings: UserTelegramSettingsInput & { clear?: boolean }
  ): Observable<{
    success: boolean;
    message: string;
    config: UserTelegramConfigStatus;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      config: UserTelegramConfigStatus;
    }>('/api/user/telegram-settings', settings);
  }

  deleteSettings(): Observable<{
    success: boolean;
    message: string;
    config: UserTelegramConfigStatus;
  }> {
    return this.http.delete<{
      success: boolean;
      message: string;
      config: UserTelegramConfigStatus;
    }>('/api/user/telegram-settings');
  }

  testNotification(payload?: {
    telegramId?: string | number;
    telegramUsername?: string;
    customMessage?: string;
  }): Observable<{
    success: boolean;
    message: string;
    chatId?: number | string;
    error?: string;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      chatId?: number | string;
      error?: string;
    }>('/api/user/telegram-settings/test', payload || {});
  }
}
