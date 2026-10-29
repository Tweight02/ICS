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
           {
            label: 'Representatives',
            route: '/pastor/view-representatives',
            icon: 'bi-people'
          },
          {
            label: 'Events',
            route: '/pastor/events',
            icon: 'bi-calendar-event'
          },
          {
              label: 'Reports',
              route: '/pastor/reports/details',
             icon: 'bi-bar-chart'
          }
        ];

      // CHURCH REPRESENTATIVE
      case 'representative':
        return [
          {
            label: 'Events',
            route: '/representative/events',
            icon: 'bi-calendar-event'
          },
          {
            label: 'Reports',
            route: '/representative/reports/programs',
            icon: 'bi-bar-chart'
          }
        ];

      // ADMINISTRATIVE ASSISTANT
      case 'assistant':
      case 'head assistant':
      case 'head_assistant':
      case 'head-assistant':
        return [
           {
            label: 'Pastors',
            route: '/assistant/view-user',
            icon: 'bi-person'
          },
          {
            label: 'Events',
            route: '/assistant/events',
            icon: 'bi-calendar-event'
          },
          {
            label: 'Reports',
            route: '/assistant/reports',
            icon: 'bi-bar-chart'
          }
        ];

      // ADMINISTRATOR + DIRECTOR
      case 'director':
      case 'head director':
      case 'head_director':
      case 'head-director':
        return [
          {
            label: 'Events',
            route: '/director/events',
            icon: 'bi-calendar-event'
          },
          {
            label: 'Reports',
            route: '/director/reports',
            icon: 'bi-bar-chart'
          }
          
        ];

      // EVENTS REPRESENTATIVE
      case 'events':
        return [
          {
            label: 'Events',
            route: '/events',
            icon: 'bi-calendar-event'
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

      case 'head assistant':
      case 'head_assistant':
      case 'head-assistant':
        return 'Head Assistant';

      case 'director':
        return 'Director';

      case 'head director':
      case 'head_director':
      case 'head-director':
        return 'Head Director';

      case 'events':
        return 'Events Representative';

      default:
        return 'User';
    }
  }
}