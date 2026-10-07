import { Injectable } from '@angular/core';
import { UserRole } from '../models/user.model';

export interface SidebarItem {
  label: string;
  route: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SidebarService {

  constructor() {}

  getMenu(role: UserRole): SidebarItem[] {

    switch (role) {

      // ==========================================
      // DISTRICT PASTOR
      // ==========================================
      case 'pastor':
        return [
          {
            label: 'Reports',
            route: '/pastor/reports',
            icon: '▣'
          },
          {
            label: 'Baptism',
            route: '/pastor/baptism',
            icon: '♢'
          },
          {
            label: 'Death',
            route: '/pastor/death',
            icon: '♰'
          },
          {
            label: 'Stewardship',
            route: '/pastor/stewardship',
            icon: '◫'
          },
          {
            label: 'Events',
            route: '/pastor/events',
            icon: '▣'
          },
          {
            label: 'Church Role',
            route: '/pastor/church-role',
            icon: '♙'
          }
        ];

      // ==========================================
      // CHURCH REPRESENTATIVE
      // ==========================================
      case 'representative':
        return [
          {
            label: 'Reports',
            route: '/representative/reports',
            icon: '▣'
          },
          {
            label: 'Events',
            route: '/representative/events',
            icon: '▣'
          }
        ];

      // ==========================================
      // ADMINISTRATIVE ASSISTANT
      // ==========================================
      case 'assistant':
        return [
          {
            label: 'Reports',
            route: '/assistant/reports',
            icon: '▣'
          },
          {
            label: 'Events',
            route: '/assistant/events',
            icon: '▣'
          }
        ];

      // ==========================================
      // ADMINISTRATOR + DIRECTOR
      // ==========================================
      case 'director':
        return [
          {
            label: 'Dashboard',
            route: '/director',
            icon: '⌂'
          },
          {
            label: 'Reports',
            route: '/director/reports',
            icon: '▣'
          },
          {
            label: 'Events',
            route: '/director/events',
            icon: '▣'
          }
        ];

      // ==========================================
      // EVENTS REPRESENTATIVE
      // ==========================================
      case 'events':
        return [
          {
            label: 'Events',
            route: '/events',
            icon: '▣'
          }
        ];

      default:
        return [];
    }
  }

  getRoleName(role: UserRole): string {

    switch (role) {

      case 'pastor':
        return 'District Pastor';

      case 'representative':
        return 'Church Representative';

      case 'assistant':
        return 'Administrative Assistant';

      case 'director':
        return 'Administrator and Director';

      case 'events':
        return 'Events Representative';

      default:
        return 'User';
    }
  }
}