/** One place for the API address. Change it here and every events page follows. */
export const API_URL = 'http://127.0.0.1:8000/api';

export interface Crumb {
  label: string;
  link?: any[];
}

/** Who the event is aimed at: one church, several districts, or churches inside one district. */
export type Coverage = 'church' | 'districts' | 'churches';

export interface EventsHomeConfig {
  crumb: string; // last part of the breadcrumb, e.g. "Events"
  title: string;
  subtitle: string; // "{name}" is replaced by the workspace name
  canCreate: boolean;
  badge?: string; // e.g. "Read-only workspace"
  bannerTitle: string;
  bannerSubtitle: string; // "{name}" is replaced by the workspace name
  workspaceTitle: string;
  workspaceText: string;
  workspaceChip: string;
  workspaceFromUser?: boolean; // use the logged-in user's church / district as the workspace name
}

export interface EventOverviewConfig {
  basePath: string; // e.g. "/representative/events"
  crumbRoot: string; // "My Events" | "All Events"
  eyebrow: string;
  subtitle: string;
  backLabel: string;
  canManage: boolean; // shows Edit + Delete
  badge?: string;
  readOnlyNote?: string;
  organizerFallback: string;
}

export interface ParticipantsConfig {
  basePath: string;
  crumbRoot: string;
  eyebrow: string;
}

export interface EventFormConfig {
  basePath: string;
  crumbRoot: string;
  coverage: Coverage;
  subtitleCreate: string; // "{name}" is replaced by the assigned district name
}
