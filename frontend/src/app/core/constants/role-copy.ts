import { User } from '../models/event.model';

export interface RoleCopy {
  title: string;
  subtitle: string;
  hero: string;
  scope: string;
  blurb: string;
  chip: string;
  readOnly: boolean;
}

/** Texts that change with the role (from the design). */
export function roleCopy(u: User): RoleCopy {
  const district = u.district?.name ?? 'your district';
  switch (u.role) {
    case 'church_representative':
    case 'representative':
      return {
        title: 'Event',
        subtitle: 'Welcome back. Keep your church gatherings organized.',
        hero: 'Plan with purpose. Serve together.',
        scope: u.church?.name ?? 'Your church',
        blurb: 'Create and manage events for your assigned church.',
        chip: 'Church Representative',
        readOnly: false
      };
    case 'district_pastor':
    case 'district pastor':
    case 'district-pastor':
    case 'pastor':
      return {
        title: 'Event',
        subtitle: `Upcoming events for the churches of ${district}.`,
        hero: 'Plan with purpose. Serve together.',
        scope: district,
        blurb: 'Coordinate events for churches within your assigned district.',
        chip: 'District Pastor',
        readOnly: false
      };
    case 'assistant':
    case 'administrative_assistant':
    case 'administrative assistant':
    case 'administrative-assistant':
      return {
        title: 'Event',
        subtitle: "Coordinate upcoming gatherings across the mission's districts.",
        hero: 'Plan with purpose. Serve together.',
        scope: 'Mission-wide',
        blurb: 'Coordinate mission events across one, several, or all districts.',
        chip: 'Assistant',
        readOnly: false
      };
    default:
      return {
        title: 'All Events',
        subtitle: 'View upcoming events across The East Luzon Mission.',
        hero: 'A clear view of every gathering.',
        scope: 'Mission-wide',
        blurb: 'Browse event details and selected programs across the mission. Event records are read-only.',
        chip: 'Read-only access',
        readOnly: true
      };
  }
}
