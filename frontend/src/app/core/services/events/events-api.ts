import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventModel, ProgramNode, Department, Participant, User } from '../../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  // ==========================================
  // USUÁRIO AUTENTICADO
  // ==========================================
  getAuthenticatedUser(userId: number): Observable<User> {
    return this.http.get<any>(`${this.apiUrl}/users/${userId}`).pipe(
      map(response => response.data ?? response)
    );
  }

  // ==========================================
  // EVENTOS (`events` & `particular_items`)
  // ==========================================
  getEvents(): Observable<EventModel[]> {
    const params = new HttpParams()
      .set('status', 'all')
      .set('per_page', 50);
    return this.http.get<any>(`${this.apiUrl}/events`, { params }).pipe(
      map(response => response.data ?? response)
    );
  }

  getPublicEvents(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/public/events`).pipe(
      map(response => response.data ?? response)
    );
  }

  getPublicEventById(
    id: number,
    attribution?: { church_id: number; registration_token: string },
  ): Observable<any> {
    let params = new HttpParams();
    if (attribution) {
      params = params
        .set('church_id', attribution.church_id)
        .set('registration_token', attribution.registration_token);
    }

    return this.http.get<any>(`${this.apiUrl}/public/events/${id}`, { params }).pipe(
      map(response => response.data ?? response)
    );
  }

  getEventRegistrationLink(eventId: number): Observable<{
    church_id: number;
    registration_token: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/events/${eventId}/registration-link`, {}).pipe(
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
  }, attribution?: { church_id: number; registration_token: string }): Observable<any> {
    let params = new HttpParams();
    if (attribution) {
      params = params
        .set('church_id', attribution.church_id)
        .set('registration_token', attribution.registration_token);
    }

    return this.http.post<any>(`${this.apiUrl}/public/events/${eventId}/participants`, participant, { params }).pipe(
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

  getEventDepartments(): Observable<Department[]> {
    return this.http.get<any>(`${this.apiUrl}/event-departments`).pipe(
      map(response => response.data ?? response)
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
    churchId: number | null = null,
  ): Observable<{
    data: Participant[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
    summary?: { total: number; confirmed: number; pending: number };
    churches?: Array<{ church_id: number; name: string }>;
  }> {
    let params = new HttpParams().set('page', page);
    if (search.trim()) params = params.set('search', search.trim());
    if (status !== 'all') params = params.set('status', status);
    if (churchId !== null) params = params.set('church_id', churchId);

    return this.http.get<{
      data: Participant[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
      summary?: { total: number; confirmed: number; pending: number };
      churches?: Array<{ church_id: number; name: string }>;
    }>(`${this.apiUrl}/events/${eventId}/participants`, { params });
  }

  addParticipant(eventId: number, participant: Participant): Observable<Participant> {
    return this.http.post<any>(`${this.apiUrl}/events/${eventId}/participants`, participant).pipe(
      map(response => response.data ?? response)
    );
  }

  updateParticipantStatus(participantId: number, status: 'confirmed' | 'pending'): Observable<Participant> {
    return this.http.patch<any>(`${this.apiUrl}/participants/${participantId}`, { status }).pipe(
      map(response => response.data ?? response)
    );
  }
}
