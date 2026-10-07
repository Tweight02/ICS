export interface Church {
  church_id: number;
  name: string;
  address: string | null;
  parent_id: number | null;
}