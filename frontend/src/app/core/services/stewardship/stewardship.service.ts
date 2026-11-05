import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type StewardshipStatus = 'Draft' | 'Submitted' | 'Endorsed' | 'Approved';

export interface StewardshipParticular {
  particular_id: number;
  particular_name: string;
}

export interface StewardshipReportData {
  status: StewardshipStatus;
  dateSubmitted: string | null;
  values: Record<number, number | null>;
  monthly: Record<number, (number | null)[]>;
}

export interface StewardshipReportResponse {
  church: {
    church_id: number;
    name: string;
    district: string | null;
  };
  year: number;
  quarter?: number;
  particulars: StewardshipParticular[];
  report?: StewardshipReportData;
  reports?: Record<number, StewardshipReportData>;
}

export interface StewardshipReportSnapshot {
  year: number;
  quarter: number;
  values: { particular_id: number; value: number | null }[];
  monthly: { particular_id: number; values: (number | null)[] }[];
}

@Injectable({
  providedIn: 'root',
})
export class StewardshipService {
  private readonly apiUrl = '/api/stewardship/report';

  constructor(private readonly http: HttpClient) {}

  getReport(year: number, quarter: number): Observable<StewardshipReportResponse> {
    const params = new HttpParams()
      .set('year', year)
      .set('quarter', quarter);

    return this.http.get<StewardshipReportResponse>(this.apiUrl, { params });
  }

  saveReport(snapshot: StewardshipReportSnapshot): Observable<StewardshipActionResponse> {
    return this.http.put<StewardshipActionResponse>(this.apiUrl, snapshot);
  }

  submitReport(snapshot: StewardshipReportSnapshot): Observable<StewardshipActionResponse> {
    return this.http.post<StewardshipActionResponse>(`${this.apiUrl}/submit`, snapshot);
  }

  reopenReport(year: number, quarter: number): Observable<StewardshipActionResponse> {
    return this.http.post<StewardshipActionResponse>(`${this.apiUrl}/reopen`, {
      year,
      quarter,
    });
  }
}

export interface StewardshipActionResponse {
  message: string;
  status: StewardshipStatus;
  dateSubmitted?: string | null;
}
