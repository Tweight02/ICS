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
  };
  q1?: number | null;
  q2?: number | null;
  q3?: number | null;
  q4?: number | null;
}