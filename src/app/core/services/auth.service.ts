import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map, shareReplay } from 'rxjs';
import { User, RoleDefinition, MenuItem, AuthStatusResponse, RolesResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // State Signals
  readonly currentUser = signal<User | null>(null);
  readonly userRole = signal<string | null>(null);
  readonly roleInfo = signal<RoleDefinition | null>(null);
  readonly menuItems = signal<MenuItem[]>([]);
  readonly isConfigured = signal<boolean>(true);
  readonly isLoading = signal<boolean>(true);

  // Computed
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.userRole() === 'admin');
  readonly isOperator = computed(() => this.userRole() === 'operator' || this.userRole() === 'admin');

  private authCheck$: Observable<AuthStatusResponse> | null = null;
  private initialCheckCompleted = false;

  constructor() {
    this.checkAuth().subscribe();
  }

  checkAuth(force = false): Observable<AuthStatusResponse> {
    if (!force && this.initialCheckCompleted && !this.authCheck$) {
      return of({
        authenticated: this.isAuthenticated(),
        user: this.currentUser(),
        role: this.userRole(),
        roleInfo: this.roleInfo(),
        menu: this.menuItems(),
        configured: this.isConfigured(),
      });
    }

    if (this.authCheck$) {
      return this.authCheck$;
    }

    this.isLoading.set(true);
    this.authCheck$ = this.http.get<AuthStatusResponse>('/api/auth/me').pipe(
      tap((res) => {
        if (res.authenticated && res.user) {
          this.currentUser.set(res.user);
          this.userRole.set(res.role || res.user.role || 'user');
          this.roleInfo.set(res.roleInfo || null);
          this.menuItems.set(res.menu || []);
          this.isConfigured.set(res.configured ?? true);
        } else {
          this.clearState();
          this.isConfigured.set(res.configured ?? true);
        }
        this.initialCheckCompleted = true;
        this.isLoading.set(false);
        this.authCheck$ = null;
      }),
      catchError((err) => {
        console.error('Failed to check auth status:', err);
        this.clearState();
        this.initialCheckCompleted = true;
        this.isLoading.set(false);
        this.authCheck$ = null;
        return of({
          authenticated: false,
          user: null,
          role: null,
          roleInfo: null,
          menu: [],
          configured: true,
        });
      }),
      shareReplay(1)
    );

    return this.authCheck$;
  }

  signInWithGoogleCredential(credential: string): Observable<AuthStatusResponse> {
    this.isLoading.set(true);
    return this.http.post<AuthStatusResponse>('/api/auth/google', { credential }).pipe(
      tap((res) => {
        if (res.authenticated && res.user) {
          this.currentUser.set(res.user);
          this.userRole.set(res.role || res.user.role || 'user');
          this.roleInfo.set(res.roleInfo || null);
          this.menuItems.set(res.menu || []);
          this.router.navigate(['/']);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        throw err;
      })
    );
  }

  logout(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/api/auth/logout', {}).pipe(
      tap(() => {
        this.clearState();
        this.router.navigate(['/login']);
      }),
      catchError((err) => {
        this.clearState();
        this.router.navigate(['/login']);
        return of({ success: true });
      })
    );
  }

  getUsers(): Observable<{ users: User[] }> {
    return this.http.get<{ users: User[] }>('/api/auth/users');
  }

  updateUserRole(userId: string, role: string): Observable<{ success: boolean; user: User }> {
    return this.http.patch<{ success: boolean; user: User }>('/api/auth/users', { userId, role });
  }

  deleteUser(userId: string): Observable<{ success: boolean; userId: string }> {
    return this.http.delete<{ success: boolean; userId: string }>(`/api/auth/users?userId=${encodeURIComponent(userId)}`);
  }

  getRoles(): Observable<RolesResponse> {
    return this.http.get<RolesResponse>('/api/auth/roles');
  }

  createRole(role: { id: string; name: string; description: string; badgeColor?: any }): Observable<{ success: boolean; role: RoleDefinition }> {
    return this.http.post<{ success: boolean; role: RoleDefinition }>('/api/auth/roles', role);
  }

  deleteRole(roleId: string): Observable<{ success: boolean; roleId: string }> {
    return this.http.delete<{ success: boolean; roleId: string }>(`/api/auth/roles?roleId=${encodeURIComponent(roleId)}`);
  }

  updateMenuMappings(mappings: Record<string, string[]>): Observable<{ success: boolean; mappings: Record<string, string[]> }> {
    return this.http.put<{ success: boolean; mappings: Record<string, string[]> }>('/api/auth/roles', { mappings });
  }

  private clearState(): void {
    this.currentUser.set(null);
    this.userRole.set(null);
    this.roleInfo.set(null);
    this.menuItems.set([]);
  }
}
