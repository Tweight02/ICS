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

  // Objetos de relacionamento para compatibilidade com `roleCopy`
  church?: Org | null;
  district?: Org | null;
}

// Interface que representa um Evento vindo do banco de dados ou a ser enviado
export interface EventModel {
  id?: number;
  reporting_period: string;
  department_id: number;
  church_id: number;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  department_name?: string;
  church_name?: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | string; // <--- Atualizado com segurança
  isSample?: boolean;
  particular_ids?: number[];
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
  role: string;
  status: 'Confirmed' | 'Pending' | 'Declined' | 'confirmed' | 'pending';
  initials?: string;
}






// export type Role = 'director' | 'assistant' | 'district_pastor' | 'church_representative';
// export type EventStatus = 'upcoming' | 'ongoing' | 'completed';
// export type StatusFilter = EventStatus | 'all';

// export interface Org { id: number; name: string }

// export interface User {
//   id: number; name: string; email: string;
//   role: Role; role_label: string;
//   church: Org | null; district: Org | null;
// }

// export interface Particular { id: number; name: string }
// export interface ProgramGroupDef { id: number; name: string; particulars: Particular[] }
// export interface Department { id: number; name: string; groups: ProgramGroupDef[] }
// export interface Church { id: number; name: string; location: string | null; district_id: number }

// export interface EventItem {
//   id: number; title: string; location: string;
//   year: number; quarter: number;
//   start_date: string; end_date: string; start_time: string; end_time: string;
//   status: EventStatus; notes: string | null;
//   department: Org;
//   particular_ids: number[];
//   programs?: { id: number; name: string; selected: string[] }[];
//   scope: { label: string; all_districts: boolean; churches: Org[]; districts: Org[] };
//   organized_by: { role: string; org: string };
//   participants: { total: number; confirmed: number; pending: number };
//   abilities: { update: boolean; delete: boolean };
// }

// export interface CalendarEvent { id: number; title: string; start_date: string; end_date: string }

// export interface Participant {
//   id: number; name: string; role: string; status: 'confirmed' | 'pending'; initials: string;
// }

// export interface Page<T> {
//   data: T[];
//   meta: { current_page: number; last_page: number; from: number | null; to: number | null; total: number };
//   summary?: { total: number; confirmed: number; pending: number };
// }

// /** Body sent to POST / PUT /events. Scope fields depend on the user's role. */
// export interface EventPayload {
//   title: string; location: string; year: number; quarter: number; department_id: number;
//   particular_ids: number[];
//   start_date: string; end_date: string; start_time: string; end_time: string;
//   notes: string | null;
//   church_ids?: number[]; district_ids?: number[]; all_districts?: boolean;
// }
