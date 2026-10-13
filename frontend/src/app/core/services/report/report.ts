
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Department,
  DepartmentReport,
  ReportComment,
  SaveReportItem
} from '../../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://127.0.0.1:8000/api';

  getDepartments(churchId: number): Observable<Department[]> {
    return this.http.get<Department[]>(
      `${this.apiUrl}/churches/${churchId}/departments`
    );
  }

  getDepartmentReport(
    churchId: number,
    departmentId: number
  ): Observable<DepartmentReport> {
    return this.http.get<DepartmentReport>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/report`
    );
  }

  saveDepartmentReport(
    churchId: number,
    departmentId: number,
    items: SaveReportItem[]
  ): Observable<{ message: string; saved_count?: number }> {
    return this.http.post<{ message: string; saved_count?: number }>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/report/save`,
      { items }
    );
  }

  endorseDepartmentReport(
    churchId: number,
    departmentId: number,
    year: number | string,
    quarter: string
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/report/endorse`,
      { year, quarter }
    );
  }

  approveDepartmentReport(
    churchId: number,
    departmentId: number,
    year: number | string,
    quarter: string
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/report/approve`,
      { year, quarter }
    );
  }

  getDepartmentComments(
    churchId: number,
    departmentId: number
  ): Observable<{ data: ReportComment[] } | ReportComment[]> {
    return this.http.get<{ data: ReportComment[] } | ReportComment[]>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/comments`
    );
  }

  getComments(quarterId: number) {
    return this.http.get<{ data: ReportComment[] } | ReportComment[]>(
      `${this.apiUrl}/quarters/${quarterId}/comments`
    );
  }

  addComment(
    quarterId: number,
    churchId: number,
    departmentId: number,
    details: string
  ) {
    return this.http.post<{ message: string; data: ReportComment }>(
      `${this.apiUrl}/comments`,
      {
        quarter_id: quarterId,
        church_id: churchId,
        department_id: departmentId,
        details: details.trim()
      }
    );
  }

}
