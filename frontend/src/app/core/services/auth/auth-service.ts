import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { Message } from '../../models/message.model';
import { User } from '../../models/user.model';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token_type: 'Bearer';
  token: string;
  user: User;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'current_user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api';

  private readonly currentUserSignal =
    signal<User | null>(this.loadStoredUser());

  readonly currentUser = this.currentUserSignal.asReadonly();

  constructor(private readonly http: HttpClient) {}

  /**
   * Sample API.
   */
  getSample(): Observable<Message> {
    return this.http.get<Message>(`${this.apiUrl}/sample`);
  }

  /**
   * Log in and save the token and user.
   *
   * Remember me enabled:
   *   localStorage
   *
   * Remember me disabled:
   *   sessionStorage
   */
  login(
    payload: LoginPayload,
    remember = true
  ): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, payload)
      .pipe(
        tap((res) => {
          this.clearStorage();

          const store = remember ? localStorage : sessionStorage;

          store.setItem(TOKEN_KEY, res.token);
          store.setItem(USER_KEY, JSON.stringify(res.user));

          this.currentUserSignal.set(res.user);
        })
      );
  }

  /**
   * Return the saved bearer token from either storage.
   */
  get token(): string | null {
    return (
      localStorage.getItem(TOKEN_KEY) ??
      sessionStorage.getItem(TOKEN_KEY)
    );
  }

  /**
   * Check whether a token is stored.
   * This does not independently validate it with Laravel.
   */
  isLoggedIn(): boolean {
    return !!this.token;
  }

  /**
   * Get the current user.
   */
  getCurrentUser(): User | null {
    return this.currentUserSignal();
  }

  /**
   * Update the current user while preserving the active storage.
   */
  setCurrentUser(user: User): void {
    this.activeStore().setItem(
      USER_KEY,
      JSON.stringify(user)
    );

    this.currentUserSignal.set(user);
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/user`).pipe(
      tap((user) => this.setCurrentUser(user))
    );
  }

  updateProfile(data: FormData): Observable<{ message: string; user: User }> {
    return this.http.post<{ message: string; user: User }>(
      `${this.apiUrl}/profile`,
      data
    ).pipe(
      tap(({ user }) => this.setCurrentUser(user))
    );
  }

  /**
   * Load the previously saved user.
   */
  private loadStoredUser(): User | null {
    const storedUser =
      localStorage.getItem(USER_KEY) ??
      sessionStorage.getItem(USER_KEY);

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch (error) {
      console.error('Invalid stored user:', error);
      this.clearStorage();
      return null;
    }
  }

  /**
   * Log out and attempt to revoke the server token.
   */
  logout(): void {
    const token = this.token;

    if (token) {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`
      });

      this.http
        .post(
          `${this.apiUrl}/logout`,
          {},
          { headers }
        )
        .subscribe({
          error: (error) => {
            console.warn(
              'Server logout request failed:',
              error
            );
          }
        });
    }

    this.clearSession();
  }

  /**
   * Clear tokens and user information from both storages.
   */
  clearSession(): void {
    this.clearStorage();
    this.currentUserSignal.set(null);
  }

  /**
   * Remove saved authentication data.
   */
  private clearStorage(): void {
    for (const store of [localStorage, sessionStorage]) {
      store.removeItem(TOKEN_KEY);
      store.removeItem(USER_KEY);
    }
  }

  /**
   * Return the storage currently holding the token.
   */
  private activeStore(): Storage {
    if (sessionStorage.getItem(TOKEN_KEY)) {
      return sessionStorage;
    }

    return localStorage;
  }
}