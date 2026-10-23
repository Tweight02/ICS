import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventModel, ProgramNode, Department, Participant, User } from '../../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  // ==========================================
  // USUÁRIO AUTENTICADO
  // ==========================================
  getAuthenticatedUser(userId?: number): Observable<User> {
    return this.http.get<any>(`${this.apiUrl}/users/${userId ?? 1}`).pipe(
      map(response => response.data ?? response)
    );
  }

  // ==========================================
  // EVENTOS (`events` & `particular_items`)
  // ==========================================
  getEvents(): Observable<EventModel[]> {
    return this.http.get<any>(`${this.apiUrl}/events`).pipe(
      map(response => response.data ?? response)
    );
  }

  getPublicEvents(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/public/events`).pipe(
      map(response => response.data ?? response)
    );
  }

  getPublicEventById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/public/events/${id}`).pipe(
      map(response => response.data ?? response)
    );
  }

  registerPublicParticipant(eventId: number, participant: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    extension_name?: string;
    age: number;
    gender: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/public/events/${eventId}/participants`, participant).pipe(
      map(response => response.data ?? response)
    );
  }

  getEventById(id: number): Observable<EventModel> {
    return this.http.get<any>(`${this.apiUrl}/events/${id}`).pipe(
      map(response => response.data ?? response)
    );
  }

  createEvent(eventData: EventModel): Observable<EventModel> {
    return this.http.post<any>(`${this.apiUrl}/events`, eventData).pipe(
      map(response => response.data ?? response)
    );
  }

  updateEvent(id: number, eventData: EventModel): Observable<EventModel> {
    return this.http.put<any>(`${this.apiUrl}/events/${id}`, eventData).pipe(
      map(response => response.data ?? response)
    );
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/events/${id}`);
  }

  // ==========================================
  // DEPARTAMENTOS & PROGRAMAS (`departments` & `programs`)
  // ==========================================
  getDepartments(): Observable<Department[]> {
    return this.http.get<any>(`${this.apiUrl}/departments`).pipe(
      map(response => {
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.departments)
              ? response.departments
              : null;

        if (!list) throw new Error('The departments API returned an invalid response.');

        return list
          .map((item: any) => ({
            department_id: Number(item.department_id ?? item.id),
            department_name: String(item.department_name ?? item.name ?? item.title ?? '').trim()
          }))
          .filter((item: Department) => Number.isInteger(item.department_id) && item.department_id > 0 && item.department_name);
      })
    );
  }

  getProgramsByDepartment(departmentId: number): Observable<ProgramNode[]> {
    return this.http.get<any>(`${this.apiUrl}/departments/${departmentId}/programs`).pipe(
      map(response => Array.isArray(response) ? response : (response.data ?? []))
    );
  }

  // ==========================================
  // PARTICIPANTES (`participants`)
  // ==========================================
  getParticipantsByEvent(eventId: number): Observable<Participant[]> {
    return this.http.get<any>(`${this.apiUrl}/events/${eventId}/participants`).pipe(
      map(response => Array.isArray(response) ? response : (response.data ?? []))
    );
  }

  getParticipantsPage(
    eventId: number,
    page: number,
    search: string,
    status: string,
  ): Observable<{
    data: Participant[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
    summary?: { total: number; confirmed: number; pending: number };
  }> {
    let params = new HttpParams().set('page', page);
    if (search.trim()) params = params.set('search', search.trim());
    if (status !== 'all') params = params.set('status', status);

    return this.http.get<{
      data: Participant[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
      summary?: { total: number; confirmed: number; pending: number };
    }>(`${this.apiUrl}/events/${eventId}/participants`, { params });
  }

  addParticipant(eventId: number, participant: Participant): Observable<Participant> {
    return this.http.post<any>(`${this.apiUrl}/events/${eventId}/participants`, participant).pipe(
      map(response => response.data ?? response)
    );
  }

  updateParticipantStatus(participantId: number, status: 'Confirmed' | 'Pending' | 'Declined' | 'confirmed' | 'pending'): Observable<Participant> {
    return this.http.patch<any>(`${this.apiUrl}/participants/${participantId}`, { status }).pipe(
      map(response => response.data ?? response)
    );
  }
}
