/* =========================================================
   DEPARTMENT
========================================================= */

export interface Department {
  department_id: number;
  department_name: string;

  q1_approved?: boolean;
  q2_approved?: boolean;
  q3_approved?: boolean;
  q4_approved?: boolean;
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
   SAVE REPORT ITEM
========================================================= */

export interface SaveReportItem {
  particular_id: number;
  quarter_id: number;
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
   CHURCH
========================================================= */

export interface Church {
  church_id: number;
  name: string;
  address: string;
  parent_id: number;
}


/* =========================================================
   CHURCHES RESPONSE
========================================================= */

export interface ChurchesResponse {
  success: boolean;

  district: {
    church_id: number;
    name: string;
    address: string;
  };

  data: Church[];
}