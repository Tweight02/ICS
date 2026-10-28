export interface Church {
  church_id: number;
  name: string;
  address: string | null;
  parent_id: number | null;
  church_count?: number;
  monitoring?: {
    q1: number | null;
    q2: number | null;
    q3: number | null;
    q4: number | null;
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
    q1_submitted_data_progress?: number | null;
    q2_submitted_data_progress?: number | null;
    q3_submitted_data_progress?: number | null;
    q4_submitted_data_progress?: number | null;
  };
  q1?: number | null;
  q2?: number | null;
  q3?: number | null;
  q4?: number | null;
}