import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
        console.log('RESPOSTA BRUTA DA API DE DEPARTAMENTOS:', response);

        let list: any[] = [];
        if (Array.isArray(response)) {
          list = response;
        } else if (response && Array.isArray(response.data)) {
          list = response.data;
        } else if (response && Array.isArray(response.departments)) {
          list = response.departments;
        } else if (typeof response === 'object' && response !== null) {
          list = Object.values(response).find(val => Array.isArray(val)) as any[] || [];
        }

        return list.map((item: any) => ({
          department_id: item.department_id ?? item.id,
          department_name: item.department_name ?? item.name ?? item.title
        }));
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
