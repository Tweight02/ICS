
/* =========================================================
   DEPARTMENT
========================================================= */

export const PERSONAL_REPORT_GROUP_DEPARTMENT_ID = 16;
export const PERSONAL_REPORT_DEPARTMENT_IDS = [16, 20, 22, 23] as const;

export interface Department {
  department_id: number;
  department_name: string;

  q1_approved?: boolean;
  q2_approved?: boolean;
  q3_approved?: boolean;
  q4_approved?: boolean;
  q1_endorsed?: boolean;
  q2_endorsed?: boolean;
  q3_endorsed?: boolean;
  q4_endorsed?: boolean;

  q1_submitted?: boolean;
  q2_submitted?: boolean;
  q3_submitted?: boolean;
  q4_submitted?: boolean;

  q1_data_progress?: number | null;
  q2_data_progress?: number | null;
  q3_data_progress?: number | null;
  q4_data_progress?: number | null;

  q1_submitted_data_progress?: number | null;
  q2_submitted_data_progress?: number | null;
  q3_submitted_data_progress?: number | null;
  q4_submitted_data_progress?: number | null;
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

  value: number | string | null;
  participant_count?: number;
  completed_event_count?: number;
  combined_value?: number | null;
  monthly_values?: Record<string, number | null>;
}

/* =========================================================
   SAVE REPORT ITEM
========================================================= */

export interface SaveReportItem {
  particular_id: number;
  quarter_id: number;
  value: number | null;
  value_includes_participants?: boolean;
  monthly_values?: Record<string, number | null>;
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

export interface MissionReportSummary {
  year: string;
  total_submitted_reports: number;
  total_report_value: number;
  quarter_totals: MissionReportQuarterTotals;
  departments: MissionReportDepartmentSummary[];
}

export interface MissionReportQuarterTotals {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

export interface MissionReportDepartmentSummary {
  department_id: number;
  department_name: string;
  submitted_reports: number;
  total_report_value: number;
  quarter_totals: MissionReportQuarterTotals;
  reports: MissionReportProgramSummary[];
}

export interface MissionReportProgramSummary {
  program_id: number;
  report_name: string;
  submitted_reports: number;
  total_report_value: number;
  quarter_totals: MissionReportQuarterTotals;
  particulars?: MissionReportParticularSummary[];
}

export interface MissionReportParticularSummary {
  particular_id: number;
  particular_name: string;
  submitted_reports: number;
  total_report_value: number;
  quarter_totals: MissionReportQuarterTotals;
}

export interface ReportSummaryDrilldownEntry {
  church_id: number;
  church_name: string;
  value: number;
  submitted_reports: number;
}

export interface ReportSummaryDrilldownParticular {
  particular_id: number;
  particular_name: string;
  value: number;
}

export interface ReportSummaryDrilldown {
  level: 'districts' | 'churches' | 'particulars';
  year: string;
  quarter: string;
  department_name: string;
  report_name: string;
  particular_name: string;
  district_id?: number;
  district_name?: string;
  church_id?: number;
  church_name?: string;
  entries?: ReportSummaryDrilldownEntry[];
  particulars?: ReportSummaryDrilldownParticular[];
}

export interface BaptismSummaryRecord {
  baptism_id: number;
  church_id: number;
  church_name: string;
  district_id: number;
  district_name: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  extension_name: string | null;
  gender: string;
  date_of_baptism: string;
  place_of_baptism: string;
  officiating_minister: string;
  is_reclaimed: boolean;
  birthdate?: string | null;
  address?: string | null;
  marital_status?: string | null;
}

export interface DeathSummaryRecord {
  death_id: number;
  baptism_id: number;
  church_id: number;
  church_name: string;
  district_id: number;
  district_name: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  extension_name: string | null;
  gender: string;
  quarter: string;
  date_of_death: string;
  birthdate: string | null;
  address: string | null;
  marital_status: string | null;
  date_of_baptism: string | null;
  place_of_baptism: string | null;
  officiating_minister: string | null;
  is_reclaimed: boolean;
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