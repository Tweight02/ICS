import {
  Component,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import {
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import {
  SidebarItem,
  SidebarService
} from '../../../core/services/sidebar';

import {
  User,
  UserRole
} from '../../../core/models/user.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,

  imports: [
    RouterLink,
    RouterLinkActive
  ],

  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnChanges {

  @Input() user: User | null = null;

  menuItems: SidebarItem[] = [];

  roleName = 'User';

  constructor(
    private readonly sidebarService: SidebarService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {

    if (
      changes['user'] &&
      this.user
    ) {

      const role = this.user.role as UserRole;

      this.menuItems =
        this.sidebarService.getMenu(role);

      this.roleName =
        this.sidebarService.getRoleName(role);
    }
  }

  get userName(): string {

    if (!this.user) {
      return 'User';
    }

    return [
      this.user.first_name,
      this.user.middle_name,
      this.user.last_name,
      this.user.extension_name
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || 'User';
  }

  get userInitials(): string {

    const name =
      this.userName
        .split(/\s+/)
        .filter(Boolean);

    if (name.length === 0) {
      return 'U';
    }

    if (name.length === 1) {
      return name[0]
        .substring(0, 2)
        .toUpperCase();
    }

    return (
      name[0].charAt(0) +
      name[name.length - 1].charAt(0)
    ).toUpperCase();
  }

  logout(): void {

    console.log('Logout');

    // Put your AuthService logout here
    // when the authentication workflow is connected.
  }
}