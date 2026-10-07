export interface Church {
  church_id: number;
  name: string;
  address: string | null;
  parent_id: number | null;
}

export interface DistrictResponse {
  success: boolean;
  data: Church[];
}

export interface ChurchesResponse {
  success: boolean;
  district: Church;
  data: Church[];
}