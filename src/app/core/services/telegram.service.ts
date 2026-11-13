import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TelegramStatusResponse,
  TelegramMessageLog,
  DeploymentNotificationOptions,
  BroadcastResult,
  MessageDirection,
} from '../models/telegram.models';

@Injectable({
  providedIn: 'root',
})
export class TelegramService {
  private http = inject(HttpClient);

  getStatus(): Observable<TelegramStatusResponse> {
    return this.http.get<TelegramStatusResponse>('/api/telegram/setup-webhook');
  }

  setupWebhook(url?: string): Observable<{ success: boolean; webhookUrl: string; webhookInfo: any }> {
    return this.http.post<{ success: boolean; webhookUrl: string; webhookInfo: any }>('/api/telegram/setup-webhook', { url });
  }

  deleteWebhook(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>('/api/telegram/setup-webhook');
  }

  getMessages(filters?: {
    chatId?: number;
    userId?: number;
    direction?: MessageDirection;
    limit?: number;
    offset?: number;
  }): Observable<{ count: number; messages: TelegramMessageLog[] }> {
    let params = new HttpParams();
    if (filters?.chatId) params = params.set('chatId', filters.chatId.toString());
    if (filters?.userId) params = params.set('userId', filters.userId.toString());
    if (filters?.direction) params = params.set('direction', filters.direction);
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    if (filters?.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<{ count: number; messages: TelegramMessageLog[] }>('/api/telegram/messages', { params });
  }

  sendDeploymentNotification(options: DeploymentNotificationOptions = {}): Observable<{ success: boolean; result: BroadcastResult; message?: string }> {
    return this.http.post<{ success: boolean; result: BroadcastResult; message?: string }>('/api/telegram/notify-deployment', options);
  }
}
