import { Injectable } from '@angular/core';
import { UserRole } from '../models/user.model';

export interface SidebarItem {
  label: string;
  icon: string;
  route: string;
}

@Injectable({
  providedIn: 'root'
})
export class SidebarService {

  private menus: Record<UserRole, SidebarItem[]> = {

    representative: [
      {
        label: 'Dashboard',
        icon: 'dashboard',
        route: '/representative/dashboard'
      },
      {
        label: 'Reports',
        icon: 'bar_chart',
        route: '/representative/reports'
      },
      {
        label: 'Events',
        icon: 'calendar_month',
        route: '/representative/events'
      },
      {
        label: 'Announcement',
        icon: 'notifications',
        route: '/representative/announcements'
      }
    ],

    pastor: [
      {
        label: 'Reports',
        icon: 'bar_chart',
        route: '/pastor/reports'
      },
      {
        label: 'Events',
        icon: 'calendar_month',
        route: '/pastor/events'
      },
      {
        label: 'Announcement',
        icon: 'notifications',
        route: '/pastor/announcements'
      }
    ],

    director: [
      {
        label: 'Dashboard',
        icon: 'dashboard',
        route: '/director/dashboard'
      },
      {
        label: 'Reports',
        icon: 'bar_chart',
        route: '/director/reports'
      },
      {
        label: 'Churches',
        icon: 'church',
        route: '/director/churches'
      },
      {
        label: 'Users',
        icon: 'group',
        route: '/director/users'
      },
      {
        label: 'Events',
        icon: 'calendar_month',
        route: '/director/events'
      },
      {
        label: 'Announcement',
        icon: 'notifications',
        route: '/director/announcements'
      }
    ],

    assistant: [
      {
        label: 'Dashboard',
        icon: 'dashboard',
        route: '/assistant/dashboard'
      },
      {
        label: 'Reports',
        icon: 'bar_chart',
        route: '/assistant/reports'
      },
      {
        label: 'Events',
        icon: 'calendar_month',
        route: '/assistant/events'
      },
      {
        label: 'Announcement',
        icon: 'notifications',
        route: '/assistant/announcements'
      }
    ],

    participant: [
      {
        label: 'My Events',
        icon: 'calendar_month',
        route: '/participant/events'
      },
      {
        label: 'Announcement',
        icon: 'notifications',
        route: '/participant/announcements'
      },
      {
        label: 'Profile',
        icon: 'person',
        route: '/participant/profile'
      }
    ]
  };

  getMenu(role: UserRole): SidebarItem[] {
    return this.menus[role] ?? [];
  }
}