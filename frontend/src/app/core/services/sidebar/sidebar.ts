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
  label: 'Reports',
  route: '/pastor/reports/details',
  icon: 'bi-bar-chart'
},

          {
            label: 'Baptism and Death',
            route: '/pastor/baptism',
            icon: 'bi-droplet'
          },
          {
            label: 'Events',
            route: '/pastor/events',
            icon: 'bi-calendar-event'
          },
          {
            label: 'Representatives',
            route: '/pastor/view-representatives',
            icon: 'bi-people'
          }
          
        ];

      // CHURCH REPRESENTATIVE
      case 'representative':
        return [
          {
            label: 'Reports',
            route: '/representative/reports/programs',
            icon: 'bi-bar-chart'
          },
          {
            label: 'Events',
            route: '/representative/events',
            icon: 'bi-calendar-event'
          },
          {
            label: 'Stewardship',
            route: '/representative/stewardship',
            icon: 'bi-cash-coin'
          },
        ];

      // ADMINISTRATIVE ASSISTANT
      case 'assistant':
        return [
          {
            label: 'Reports',
            route: '/assistant/reports',
            icon: 'bi-bar-chart'
          },
          {
            label: 'Events',
            route: '/assistant/events',
            icon: 'bi-calendar-event'
          },
          {
            label: 'Pastors',
            route: '/assistant/view-user',
            icon: 'bi-person'
          }
        ];

      // ADMINISTRATOR + DIRECTOR
      case 'director':
        return [
          {
            label: 'Dashboard',
            route: '/director',
            icon: 'bi-house',
            exact: true
          },
          {
            label: 'Reports',
            route: '/director/reports',
            icon: 'bi-bar-chart'
          },
          {
            label: 'Events',
            route: '/director/events',
            icon: 'bi-calendar-event'
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

      case 'director':
        return 'Administrator and Director';

      case 'events':
        return 'Events Representative';

      default:
        return 'User';
    }
  }
}