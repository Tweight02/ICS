import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/* =========================================================
   DEPARTMENT
========================================================= */

export interface Department {
  department_id: number;
  department_name: string;

  q1_approved: boolean;
  q2_approved: boolean;
  q3_approved: boolean;
  q4_approved: boolean;
}


/* =========================================================
   QUARTER REPORT
========================================================= */

export interface ReportQuarter {
  quarter_id: number;

  quarter: string;
  year: string;

  date_submitted: string | null;
  district_endorse: string | null;
  mission_approve: string | null;

  value: number | null;
}


/* =========================================================
   PARTICULAR
========================================================= */

export interface Particular {
  particular_id: number;
  particular_name: string;

  quarters: ReportQuarter[];
}


/* =========================================================
   PROGRAM SECTION
========================================================= */

export interface ProgramSection {
  program_id: number;
  program_name: string;

  particulars: Particular[];
}


/* =========================================================
   PROGRAM
========================================================= */

export interface Program {
  program_id: number;
  program_name: string;

  sections: ProgramSection[];
}


/* =========================================================
   DEPARTMENT REPORT
========================================================= */

export interface DepartmentReport {
  church_id: number;

  department: Department;

  programs: Program[];
}


/* =========================================================
   COMMENT
========================================================= */

export interface ReportComment {
  comment_id: number;

  quarter_id: number;

  commented_by: number;

  details: string;

  date_commented: string;

  first_name: string;

  middle_name?: string | null;

  last_name: string;

  role?: string | null;
}


/* =========================================================
   REPORT SERVICE
========================================================= */

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://127.0.0.1:8000/api';


  /* =======================================================
     GET DEPARTMENTS
     
     Returns all departments for a specific church.
     
     The backend also returns:
       q1_approved
       q2_approved
       q3_approved
       q4_approved
  ======================================================= */

  getDepartments(
    churchId: number
  ): Observable<Department[]> {

    return this.http.get<Department[]>(
      `${this.apiUrl}/churches/${churchId}/departments`
    );
  }


  /* =======================================================
     GET DEPARTMENT REPORT
     
     Returns the complete report:
       Department
       Programs
       Sections
       Particulars
       Quarter values
       Approval information
  ======================================================= */

  getDepartmentReport(
    churchId: number,
    departmentId: number
  ): Observable<DepartmentReport> {

    return this.http.get<DepartmentReport>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/report`
    );
  }


  /* =======================================================
     GET COMMENTS
     
     Comments are attached to a quarter_id.
     
     Your component will only request comments for the
     CURRENT QUARTER.
  ======================================================= */

  getComments(
    quarterId: number
  ): Observable<ReportComment[]> {

    return this.http.get<ReportComment[]>(
      `${this.apiUrl}/quarters/${quarterId}/comments`
    );
  }


  /* =======================================================
     ADD COMMENT
     
     The backend is responsible for checking:
     
       1. Quarter exists
       2. User exists
       3. Quarter is the current quarter
       4. Quarter is the current year
       5. Report is NOT yet approved
     
     Therefore the frontend does not need a quarter selector.
  ======================================================= */

  addComment(
    quarterId: number,
    commentedBy: number,
    details: string
  ): Observable<ReportComment> {

    return this.http.post<ReportComment>(
      `${this.apiUrl}/comments`,
      {
        quarter_id: quarterId,
        commented_by: commentedBy,
        details: details.trim()
      }
    );
  }

}