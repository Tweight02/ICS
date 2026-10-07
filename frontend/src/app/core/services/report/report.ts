import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Department {
  department_id: number;
  department_name: string;
}

export interface QuarterReport {
  quarter: string;
  year: string;
  date_submitted: string | null;
  district_endorse: string | null;
  mission_approve: string | null;
  value: number | null;
}

export interface Particular {
  particular_id: number;
  particular_name: string;
  quarters: QuarterReport[];
}

export interface ProgramSection {
  program_id: number;
  program_name: string;
  particulars: Particular[];
}

export interface Program {
  program_id: number;
  program_name: string;
  sections: ProgramSection[];
}

export interface DepartmentReport {
  church_id: number;
  department: Department;
  programs: Program[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private http = inject(HttpClient);

  private apiUrl = 'http://127.0.0.1:8000/api';

  // Get departments after selecting a church
  getDepartments(churchId: number): Observable<Department[]> {
    return this.http.get<Department[]>(
      `${this.apiUrl}/churches/${churchId}/departments`
    );
  }

  // Get the specific department report
  getDepartmentReport(
    churchId: number,
    departmentId: number
  ): Observable<DepartmentReport> {

    return this.http.get<DepartmentReport>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/report`
    );
  }
}