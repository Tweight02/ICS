export type UserRole =
  | 'pastor'
  | 'representative'
  | 'assistant'
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

  role: UserRole;

  department_id?: number;
  church_id?: number;

  created_at?: string;
  updated_at?: string;
}