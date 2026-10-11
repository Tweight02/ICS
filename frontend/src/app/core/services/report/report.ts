
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

  getDepartmentComments(
    churchId: number,
    departmentId: number
  ): Observable<ReportComment[]> {
    return this.http.get<ReportComment[]>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/comments`
    );
  }

  
getComments(quarterId: number) {
  return this.http.get<any>(
    `${this.apiUrl}/quarters/${quarterId}/comments`
  );
}


addComment(
  quarterId: number,
  commentedBy: number,
  details: string
) {
  return this.http.post<any>(
    `${this.apiUrl}/comments`,
    {
      quarter_id: quarterId,
      commented_by: commentedBy,
      details: details.trim()
    }
  );
}

}