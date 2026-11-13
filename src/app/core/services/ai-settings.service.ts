import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  UserOpenAiConfigStatus,
  UserOpenAiSettingsInput,
  ValidateAiSettingsResult,
  OpenAiModelInfo,
} from '../models/openai.models';

@Injectable({
  providedIn: 'root',
})
export class AiSettingsService {
  private http = inject(HttpClient);

  getSettings(): Observable<{ success: boolean; config: UserOpenAiConfigStatus }> {
    return this.http.get<{ success: boolean; config: UserOpenAiConfigStatus }>('/api/user/ai-settings');
  }

  getAvailableModels(
    apiKey?: string,
    organization?: string
  ): Observable<{
    success: boolean;
    source: 'openai-api' | 'catalog';
    models: string[];
    modelDetails: OpenAiModelInfo[];
    categories: string[];
    error?: string;
  }> {
    let params = new HttpParams();
    if (apiKey) params = params.set('apiKey', apiKey);
    if (organization) params = params.set('organization', organization);

    return this.http.get<{
      success: boolean;
      source: 'openai-api' | 'catalog';
      models: string[];
      modelDetails: OpenAiModelInfo[];
      categories: string[];
      error?: string;
    }>('/api/user/ai-settings/models', { params });
  }

  saveSettings(settings: UserOpenAiSettingsInput & { clear?: boolean }): Observable<{ success: boolean; message: string; config: UserOpenAiConfigStatus }> {
    return this.http.post<{ success: boolean; message: string; config: UserOpenAiConfigStatus }>('/api/user/ai-settings', settings);
  }

  deleteSettings(): Observable<{ success: boolean; message: string; config: UserOpenAiConfigStatus }> {
    return this.http.delete<{ success: boolean; message: string; config: UserOpenAiConfigStatus }>('/api/user/ai-settings');
  }

  validateApiKey(apiKey: string, model?: string, organization?: string): Observable<{ success: boolean; completion?: string; error?: string; log?: any }> {
    return this.http.post<{ success: boolean; completion?: string; error?: string; log?: any }>('/api/openai/test', {
      prompt: 'Ping: Overeni platnosti OpenAI API klice pro MARC system.',
      apiKey,
      model,
      organization,
    });
  }
}
