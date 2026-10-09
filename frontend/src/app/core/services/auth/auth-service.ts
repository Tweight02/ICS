import { HttpClient } from '@angular/common/http';
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
const USER_KEY = 'current_user'; // same key the app already uses

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly apiUrl =
    'http://127.0.0.1:8000/api';

  private readonly currentUserSignal =
    signal<User | null>(this.loadStoredUser());

  readonly currentUser =
    this.currentUserSignal.asReadonly();


  constructor(
    private readonly http: HttpClient
  ) {}


  /*
   * Existing sample API
   */
  getSample() {
    return this.http.get<Message>(
      `${this.apiUrl}/sample`
    );
  }


  /*
   * Login: request a Sanctum bearer token.
   * "Remember me" on  -> localStorage (persists)
   * "Remember me" off -> sessionStorage (cleared when the tab closes)
   */
  login(payload: LoginPayload, remember = true): Observable<LoginResponse> {

    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, payload)
      .pipe(
        tap((res) => {

          this.clearSession();

          const store = remember ? localStorage : sessionStorage;
          store.setItem(TOKEN_KEY, res.token);

          this.setCurrentUser(res.user);

        })
      );
  }


  /*
   * Bearer token used by the HTTP interceptor
   */
  get token(): string | null {

    return localStorage.getItem(TOKEN_KEY)
      ?? sessionStorage.getItem(TOKEN_KEY);

  }


  isLoggedIn(): boolean {

    return !!this.token;

  }


  /*
   * Get currently logged-in user
   */
  getCurrentUser(): User | null {

    return this.currentUserSignal();

  }


  /*
   * Save logged-in user (in the same storage as the token)
   */
  setCurrentUser(user: User): void {

    this.activeStore().setItem(
      USER_KEY,
      JSON.stringify(user)
    );

    this.currentUserSignal.set(user);

  }


  /*
   * Load user saved in browser
   */
  private loadStoredUser(): User | null {

    const storedUser =
      localStorage.getItem(USER_KEY)
      ?? sessionStorage.getItem(USER_KEY);

    if (!storedUser) {
      return null;
    }

    try {

      return JSON.parse(storedUser) as User;

    } catch (error) {

      console.error(
        'Invalid stored user:',
        error
      );

      this.clearStorage();

      return null;
    }
  }


  /*
   * Logout: revoke the token on the server (best effort),
   * then clear everything locally right away.
   */
  logout(): void {

    const token = this.token;

    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        error: () => { /* token may already be expired; ignore */ }
      });
    }
    

    this.clearSession();

  }


  /*
   * Clear token + user (used by logout and the 401 interceptor)
   */
  clearSession(): void {

    this.clearStorage();

    this.currentUserSignal.set(null);

  }


  private clearStorage(): void {

    for (const store of [localStorage, sessionStorage]) {
      store.removeItem(TOKEN_KEY);
      store.removeItem(USER_KEY);
    }

  }


  private activeStore(): Storage {

    return sessionStorage.getItem(TOKEN_KEY)
      ? sessionStorage
      : localStorage;

  }

}