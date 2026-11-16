import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  WishItem,
  CreateWishInput,
  UpdateWishInput,
  WishesResponse,
  WishResponse,
} from '../models/wish-list.models';

@Injectable({
  providedIn: 'root',
})
export class WishListService {
  private http = inject(HttpClient);

  getWishes(filters?: {
    search?: string;
    status?: string;
    userId?: string;
  }): Observable<WishesResponse> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status && filters.status !== 'all') params = params.set('status', filters.status);
    if (filters?.userId) params = params.set('userId', filters.userId);

    return this.http.get<WishesResponse>('/api/wish-list', { params });
  }

  getWish(id: string): Observable<WishResponse> {
    return this.http.get<WishResponse>(`/api/wish-list/${encodeURIComponent(id)}`);
  }

  createWish(input: CreateWishInput): Observable<WishResponse> {
    return this.http.post<WishResponse>('/api/wish-list', input);
  }

  updateWish(id: string, input: UpdateWishInput): Observable<WishResponse> {
    return this.http.put<WishResponse>(`/api/wish-list/${encodeURIComponent(id)}`, input);
  }

  incrementCounter(id: string, amount = 1): Observable<WishResponse> {
    return this.http.post<WishResponse>(`/api/wish-list/${encodeURIComponent(id)}/increment`, {
      amount,
    });
  }

  deleteWish(id: string): Observable<{ success: boolean; id: string; message: string }> {
    return this.http.delete<{ success: boolean; id: string; message: string }>(
      `/api/wish-list/${encodeURIComponent(id)}`
    );
  }
}
