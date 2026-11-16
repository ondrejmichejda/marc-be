import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TrackedItem,
  CreateTrackerInput,
  UpdateTrackerInput,
  TrackersResponse,
  TrackerResponse,
  ResetTrackerResponse,
  TrackerResetsResponse,
} from '../models/tracking.models';

@Injectable({
  providedIn: 'root',
})
export class TrackingService {
  private http = inject(HttpClient);

  getTrackers(filters?: {
    search?: string;
    status?: string;
    userId?: string;
  }): Observable<TrackersResponse> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status && filters.status !== 'all') params = params.set('status', filters.status);
    if (filters?.userId) params = params.set('userId', filters.userId);

    return this.http.get<TrackersResponse>('/api/tracking', { params });
  }

  getTracker(id: string): Observable<TrackerResponse> {
    return this.http.get<TrackerResponse>(`/api/tracking/${encodeURIComponent(id)}`);
  }

  createTracker(input: CreateTrackerInput): Observable<TrackerResponse> {
    return this.http.post<TrackerResponse>('/api/tracking', input);
  }

  updateTracker(id: string, input: UpdateTrackerInput): Observable<TrackerResponse> {
    return this.http.put<TrackerResponse>(`/api/tracking/${encodeURIComponent(id)}`, input);
  }

  deleteTracker(id: string): Observable<{ success: boolean; id: string; message: string }> {
    return this.http.delete<{ success: boolean; id: string; message: string }>(`/api/tracking/${encodeURIComponent(id)}`);
  }

  resetTracker(id: string, note?: string): Observable<ResetTrackerResponse> {
    return this.http.post<ResetTrackerResponse>(`/api/tracking/${encodeURIComponent(id)}/reset`, { note });
  }

  getResetLogs(id: string): Observable<TrackerResetsResponse> {
    return this.http.get<TrackerResetsResponse>(`/api/tracking/${encodeURIComponent(id)}/resets`);
  }

  notifyTracker(id: string): Observable<{ success: boolean; message: string; messageId?: number; error?: string }> {
    return this.http.post<{ success: boolean; message: string; messageId?: number; error?: string }>(
      `/api/tracking/${encodeURIComponent(id)}/notify`,
      {}
    );
  }
}
