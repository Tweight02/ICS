import { Injectable } from '@angular/core';
import { UserRole } from '../../models/user.model';

export interface SidebarItem {
  label: string;
  route: string;
  icon?: string;
  exact?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SidebarService {

  getMenu(role: UserRole): SidebarItem[] {

    switch (role) {

      // DISTRICT PASTOR
      case 'pastor':
        return [
          { label: 'Reports',     route: '/pastor/reports',     icon: 'bi-bar-chart' },
          { label: 'Baptism',     route: '/pastor/baptism',     icon: 'bi-droplet' },
          { label: 'Death',       route: '/pastor/death',       icon: 'bi-flower1' },
          { label: 'Stewardship', route: '/pastor/stewardship', icon: 'bi-cash-coin' },
          { label: 'Events',      route: '/pastor/events',      icon: 'bi-calendar-event' },
          { label: 'Church Role', route: '/pastor/church-role', icon: 'bi-people' }
        ];

      // CHURCH REPRESENTATIVE
      case 'representative':
        return [
          { label: 'Reports', route: '/representative/reports', icon: 'bi-bar-chart' },
          { label: 'Events',  route: '/representative/events',  icon: 'bi-calendar-event' }
        ];

      // ADMINISTRATIVE ASSISTANT
      case 'assistant':
        return [
          { label: 'Reports', route: '/assistant/reports', icon: 'bi-bar-chart' },
          { label: 'Events',  route: '/assistant/events',  icon: 'bi-calendar-event' }
        ];

      // ADMINISTRATOR + DIRECTOR
      case 'director':
        return [
          { label: 'Dashboard', route: '/director',         icon: 'bi-house', exact: true },
          { label: 'Reports',   route: '/director/reports', icon: 'bi-bar-chart' },
          { label: 'Events',    route: '/director/events',  icon: 'bi-calendar-event' }
        ];

      // EVENTS REPRESENTATIVE
      case 'events':
        return [
          { label: 'Events', route: '/events', icon: 'bi-calendar-event' }
        ];

      default:
        return [];
    }
  }

  getRoleName(role: UserRole): string {

    switch (role) {
      case 'pastor':         return 'District Pastor';
      case 'representative': return 'Church Representative';
      case 'assistant':      return 'Administrative Assistant';
      case 'director':       return 'Administrator and Director';
      case 'events':         return 'Events Representative';
      default:               return 'User';
    }
  }
}