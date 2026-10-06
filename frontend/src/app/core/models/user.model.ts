export type UserRole =
  | 'representative'
  | 'pastor'
  | 'director'
  | 'assistant'
  | 'participant';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
}