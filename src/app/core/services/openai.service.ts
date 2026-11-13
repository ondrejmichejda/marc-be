import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  OpenAiUsageSummary,
  OpenAiConfigStatus,
  OpenAiModelInfo,
  OpenAiMessageLog,
} from '../models/openai.models';

@Injectable({
  providedIn: 'root',
})
export class OpenAiService {
  private http = inject(HttpClient);

  getUsage(): Observable<{ config: OpenAiConfigStatus; usage: OpenAiUsageSummary; timestamp: string }> {
    return this.http.get<{ config: OpenAiConfigStatus; usage: OpenAiUsageSummary; timestamp: string }>('/api/openai/usage');
  }

  getModels(): Observable<{ count: number; models: OpenAiModelInfo[]; popularModels: string[]; defaultModel: string }> {
    return this.http.get<{ count: number; models: OpenAiModelInfo[]; popularModels: string[]; defaultModel: string }>('/api/openai/models');
  }

  getMessages(filters?: {
    model?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<{ count: number; messages: OpenAiMessageLog[]; timestamp: string }> {
    let params = new HttpParams();
    if (filters?.model) params = params.set('model', filters.model);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit.toString());
    if (filters?.offset) params = params.set('offset', filters.offset.toString());

    return this.http.get<{ count: number; messages: OpenAiMessageLog[]; timestamp: string }>('/api/openai/messages', { params });
  }

  clearMessages(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>('/api/openai/messages');
  }

  testPrompt(options: {
    prompt: string;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    webSearch?: boolean;
    apiKey?: string;
    organization?: string;
  }): Observable<{
    success: boolean;
    completion: string;
    log: OpenAiMessageLog;
    timestamp: string;
  }> {
    return this.http.post<{
      success: boolean;
      completion: string;
      log: OpenAiMessageLog;
      timestamp: string;
    }>('/api/openai/test', options);
  }
}
