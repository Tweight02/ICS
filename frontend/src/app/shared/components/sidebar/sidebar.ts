import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';

import {
  SidebarItem,
  SidebarService
} from '../../../core/services/sidebar/sidebar';

import { User, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnChanges {

  @Input() user: User | null = null;
  @Output() collapsedChange = new EventEmitter<boolean>();

  menuItems: SidebarItem[] = [];
  roleName = 'User';
  collapsed = false;

  constructor(private readonly sidebarService: SidebarService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      const role = this.user.role as UserRole;
      this.menuItems = this.sidebarService.getMenu(role);
      this.roleName  = this.sidebarService.getRoleName(role);
    }
  }

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  get userName(): string {
    if (!this.user) return 'User';

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
    const parts = this.userName.split(/\s+/).filter(Boolean);

    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  logout(): void {
    console.log('Logout');
    // Call your AuthService logout here
  }
}