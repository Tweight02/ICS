export type UserRole =
  | 'pastor'
  | 'district pastor'
  | 'district_pastor'
  | 'district-pastor'
  | 'representative'
  | 'assistant'
  | 'administrative assistant'
  | 'administrative_assistant'
  | 'administrative-assistant'
  | 'director'
  | 'events';

export interface User {

  user_id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  extension_name?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  email: string;
  profile_image?: string | null;
  role: UserRole;
  status?: 'active' | 'inactive';
  department_id?: number;
  church_id?: number;
  created_at?: string;
  updated_at?: string;

}