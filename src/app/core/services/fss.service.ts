import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  FireSafetySolution,
  FireSafetySolutionProperties,
  FssTechnicalDocumentationFile,
  FssPromptTemplate,
  GenerateFieldResponse,
  GenerateBatchResponse,
  FssTemplatesResponse,
  FssTemplateActionResponse,
} from '../models/fss.models';

@Injectable({
  providedIn: 'root',
})
export class FssService {
  private http = inject(HttpClient);

  getSolutions(): Observable<{ solutions: FireSafetySolution[] }> {
    return this.http.get<{ solutions: FireSafetySolution[] }>('/api/fss');
  }

  getSolution(id: string): Observable<{ solution: FireSafetySolution }> {
    return this.http.get<{ solution: FireSafetySolution }>(`/api/fss/${id}`);
  }

  createSolution(solution: Partial<FireSafetySolution>): Observable<{ solution: FireSafetySolution }> {
    return this.http.post<{ solution: FireSafetySolution }>('/api/fss', solution);
  }

  updateSolution(id: string, solution: Partial<FireSafetySolution>): Observable<{ solution: FireSafetySolution }> {
    return this.http.put<{ solution: FireSafetySolution }>(`/api/fss/${id}`, solution);
  }

  deleteSolution(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/api/fss/${id}`);
  }

  generateField(
    fieldKey: string,
    payload?: {
      fssId?: string;
      solutionId?: string;
      properties?: Partial<FireSafetySolutionProperties>;
      files?: FssTechnicalDocumentationFile[];
      customInstructions?: string;
      model?: string;
      temperature?: number;
    }
  ): Observable<GenerateFieldResponse> {
    return this.http.post<GenerateFieldResponse>('/api/fss/generate', {
      fieldKey,
      ...payload,
    });
  }

  generateBatch(
    payload?: {
      fieldKeys?: string[];
      fssId?: string;
      solutionId?: string;
      properties?: Partial<FireSafetySolutionProperties>;
      files?: FssTechnicalDocumentationFile[];
      customInstructions?: string;
      model?: string;
      temperature?: number;
    }
  ): Observable<GenerateBatchResponse> {
    return this.http.post<GenerateBatchResponse>('/api/fss/generate', {
      ...payload,
    });
  }

  uploadFiles(
    solutionId?: string,
    formData?: FormData
  ): Observable<{ success: boolean; files: FssTechnicalDocumentationFile[] }> {
    const query = solutionId ? `?solutionId=${encodeURIComponent(solutionId)}` : '';
    return this.http.post<{ success: boolean; files: FssTechnicalDocumentationFile[] }>(
      `/api/fss/files/upload${query}`,
      formData
    );
  }

  deleteFile(solutionId: string, fileId: string): Observable<{ success: boolean; files?: FssTechnicalDocumentationFile[] }> {
    return this.http.delete<{ success: boolean; files?: FssTechnicalDocumentationFile[] }>(
      `/api/fss/${encodeURIComponent(solutionId)}/files/${encodeURIComponent(fileId)}`
    );
  }

  downloadFile(solutionId: string | undefined, fileId: string): Observable<Blob> {
    const url = solutionId
      ? `/api/fss/${encodeURIComponent(solutionId)}/files/${encodeURIComponent(fileId)}/download`
      : `/api/fss/files/${encodeURIComponent(fileId)}/download`;
    return this.http.get(url, {
      responseType: 'blob',
    });
  }

  exportDocx(solutionId: string): Observable<Blob> {
    return this.http.get(`/api/fss/${encodeURIComponent(solutionId)}/export`, {
      responseType: 'blob',
    });
  }

  exportDraftDocx(solution: Partial<FireSafetySolutionProperties> & { title?: string; id?: string }): Observable<Blob> {
    return this.http.post('/api/fss/export', solution, {
      responseType: 'blob',
    });
  }

  getPrompts(): Observable<{ prompts: FssPromptTemplate[] }> {
    return this.http.get<{ prompts: FssPromptTemplate[] }>('/api/fss/prompts');
  }

  getPrompt(fieldKey: string): Observable<{ success: boolean; prompt: FssPromptTemplate }> {
    return this.http.get<{ success: boolean; prompt: FssPromptTemplate }>(`/api/fss/prompts/${encodeURIComponent(fieldKey)}`);
  }

  updatePrompt(fieldKey: string, updates: Partial<FssPromptTemplate>): Observable<{ success: boolean; prompt: FssPromptTemplate }> {
    return this.http.put<{ success: boolean; prompt: FssPromptTemplate }>(
      `/api/fss/prompts/${encodeURIComponent(fieldKey)}`,
      updates
    );
  }

  resetPrompts(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/api/fss/prompts/reset', {});
  }

  getTemplates(): Observable<FssTemplatesResponse> {
    return this.http.get<FssTemplatesResponse>('/api/fss/templates');
  }

  uploadTemplate(formData: FormData): Observable<FssTemplateActionResponse> {
    return this.http.post<FssTemplateActionResponse>('/api/fss/templates', formData);
  }

  activateTemplate(id: string): Observable<FssTemplateActionResponse> {
    return this.http.post<FssTemplateActionResponse>(`/api/fss/templates/${encodeURIComponent(id)}/activate`, {});
  }

  deleteTemplate(id: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`/api/fss/templates/${encodeURIComponent(id)}`);
  }

  resetToDefaultTemplate(): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>('/api/fss/templates/reset', {});
  }

  downloadTemplate(id?: string): Observable<Blob> {
    const url = id ? `/api/fss/templates/${encodeURIComponent(id)}/download` : '/api/fss/templates/download';
    return this.http.get(url, { responseType: 'blob' });
  }

  downloadDefaultTemplate(): Observable<Blob> {
    return this.http.get('/api/fss/templates/download?default=true', { responseType: 'blob' });
  }
}
