// import { HttpClient } from "@angular/common/http";
// import { inject, Injectable } from "@angular/core";
// import { toSignal } from "@angular/core/rxjs-interop";
// import { Message } from "../../models/message.model";

// @Injectable({
//     providedIn: 'root'
// })
// export class AuthService {
//     getCurrentUser(): import("../../models/user.model").User | null {
//       throw new Error('Method not implemented.');
//     }
//     private http = inject(HttpClient);

//     getSample() {
//         return this.http.get<Message>('http://127.0.0.1:8000/api/sample');
//     }
// }

import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

import { Message } from '../../models/message.model';
import { User } from '../../models/user.model';

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
   * Get currently logged-in user
   */
  getCurrentUser(): User | null {

    return this.currentUserSignal();

  }


  /*
   * Save logged-in user
   */
  setCurrentUser(user: User): void {

    localStorage.setItem(
      'current_user',
      JSON.stringify(user)
    );

    this.currentUserSignal.set(user);

  }


  /*
   * Load user saved in browser
   */
  private loadStoredUser(): User | null {

    const storedUser =
      localStorage.getItem('current_user');

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

      localStorage.removeItem('current_user');

      return null;
    }
  }


  /*
   * Logout
   */
  logout(): void {

    localStorage.removeItem(
      'current_user'
    );

    this.currentUserSignal.set(null);

  }

}