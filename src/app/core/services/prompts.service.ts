import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ScheduledAiPrompt,
  CreateScheduledPromptInput,
  UpdateScheduledPromptInput,
  ScheduledPromptsSummary,
  PromptCronBatchSummary,
  RunPromptResponse,
} from '../models/prompts.models';

@Injectable({
  providedIn: 'root',
})
export class PromptsService {
  private http = inject(HttpClient);

  getPrompts(filters?: {
    time?: string;
    status?: string;
    search?: string;
    userId?: string;
  }): Observable<{
    success: boolean;
    count: number;
    prompts: ScheduledAiPrompt[];
    summary: ScheduledPromptsSummary;
  }> {
    let params = new HttpParams();
    if (filters?.time && filters.time !== 'all') params = params.set('time', filters.time);
    if (filters?.status && filters.status !== 'all') params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.userId) params = params.set('userId', filters.userId);

    return this.http.get<{
      success: boolean;
      count: number;
      prompts: ScheduledAiPrompt[];
      summary: ScheduledPromptsSummary;
    }>('/api/prompts', { params });
  }

  getPrompt(id: string): Observable<{ success: boolean; prompt: ScheduledAiPrompt }> {
    return this.http.get<{ success: boolean; prompt: ScheduledAiPrompt }>(`/api/prompts/${encodeURIComponent(id)}`);
  }

  createPrompt(input: CreateScheduledPromptInput): Observable<{ success: boolean; prompt: ScheduledAiPrompt; message: string }> {
    return this.http.post<{ success: boolean; prompt: ScheduledAiPrompt; message: string }>('/api/prompts', input);
  }

  updatePrompt(id: string, input: UpdateScheduledPromptInput): Observable<{ success: boolean; prompt: ScheduledAiPrompt; message: string }> {
    return this.http.put<{ success: boolean; prompt: ScheduledAiPrompt; message: string }>(`/api/prompts/${encodeURIComponent(id)}`, input);
  }

  deletePrompt(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`/api/prompts/${encodeURIComponent(id)}`);
  }

  runPrompt(id: string): Observable<RunPromptResponse> {
    return this.http.post<RunPromptResponse>(`/api/prompts/${encodeURIComponent(id)}/run`, {});
  }

  triggerCronBatch(timeSlot: string = 'all', secret?: string): Observable<PromptCronBatchSummary> {
    let params = new HttpParams().set('time', timeSlot);
    if (secret) params = params.set('secret', secret);
    return this.http.get<PromptCronBatchSummary>('/api/prompts/cron', { params });
  }
}
