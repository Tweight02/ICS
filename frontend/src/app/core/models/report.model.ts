
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
  year: string | number;

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

export interface ReportMonitoring {
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
}

export interface DistrictReportMonitoring {
  churchCount: number;
  monitoring: ReportMonitoring;
}

/* =========================================================
   COMMENT
========================================================= */

export interface ReportComment {
  comment_id: number;
  quarter_id: number;

  church_id?: number | null;
  department_id?: number | null;

  commented_by: number;

  // Commenter's information returned by Laravel
  commenter_name?: string | null;
  commenter_role?: string | null;

  // Comment details
  details: string;
  status?: string | null;
  date_commented: string;

  // Optional quarter information
  quarter?: string | null;
  year?: number | string | null;
}

/* =========================================================
   CHURCH
========================================================= */

export interface Church {
  church_id: number;
  name: string;
  address: string;
  parent_id: number | null;
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