// Roles suportadas no sistema
export type UserRole =
  | 'pastor'
  | 'district pastor'
  | 'district_pastor'
  | 'district-pastor'
  | 'representative'
  | 'church_representative'
  | 'assistant'
  | 'administrative assistant'
  | 'administrative_assistant'
  | 'administrative-assistant'
  | 'director'
  | 'events';

// Estrutura genérica para Entidades Relacionadas (Igreja, Distrito, Departamento)
export interface Org {
  id: number;
  name: string;
}

// Interface principal de Usuário vinda da API (Laravel /api/me ou MySQL)
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

  // Related organization objects returned by the API.
  church?: Org | null;
  district?: Org | null;
}

// Interface que representa um Evento vindo do banco de dados ou a ser enviado
export interface EventModel {
  id?: number;
  reporting_period?: string;
  year?: number;
  quarter?: number | string;
  department_id?: number;
  program_id?: number;
  church_id?: number;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  department?: Org & { department_id?: number; department_name?: string };
  department_name?: string;
  church_name?: string;
  particular_ids?: number[];
  status?: 'upcoming' | 'ongoing' | 'completed' | string; // <--- Atualizado com segurança
  isSample?: boolean;
  programs?: Array<{
    id?: number;
    name?: string;
    program_name?: string;
    particulars?: Array<{ particular_id: number; particular_name: string }>;
  }>;
  scope?: {
    label?: string;
    churches?: Org[];
    districts?: Org[];
  };
  organized_by?: string | { role?: string; org?: string } | null;
  created_at?: string;
}

// Interface para os Programas / Particularidades (tabela `programs` / MariaDB)
export interface ProgramNode {
  program_id: number;
  program_name: string;
  parent_id?: number | null;
  expanded?: boolean;
  subPrograms?: ProgramNode[];
  particulars?: Array<{ particular_id: number; particular_name: string }>;
}

// Interface para os Departamentos (atualizada conforme a tabela `departments` do MariaDB)
export interface Department {
  department_id: number;
  department_name: string;
}

// Interface para os Participantes (tabela `participants`)
export interface Participant {
  id?: number;
  event_id?: number;
  name: string;
  age: number;
  gender: string;
  status: 'confirmed' | 'pending';
  initials?: string;
}
