import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { NgClass } from '@angular/common';

import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import {
  SidebarItem,
  SidebarService
} from '../../../core/services/sidebar/sidebar';

import { AuthService } from '../../../core/services/auth/auth-service';
import { ChurchService } from '../../../core/services/church/church-service';
import { User, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class SidebarComponent implements OnChanges {

  private readonly apiBase = '';

  @Input() user: User | null = null;
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  menuItems: SidebarItem[] = [];
  roleName = 'User';
  departmentName = '';

  constructor(
    private readonly sidebarService: SidebarService,
    private readonly authService: AuthService,
    private readonly churchService: ChurchService,
    private readonly router: Router
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      const role = this.user.role as UserRole;
      this.menuItems = this.sidebarService.getMenu(role);
      this.roleName = this.sidebarService.getRoleName(role);
      this.loadDepartmentName();
    }
  }

  private loadDepartmentName(): void {
    const departmentId = Number(this.user?.department_id);
    this.departmentName = '';

    if (!Number.isInteger(departmentId) || departmentId < 1) {
      return;
    }

    this.churchService.getDepartments().subscribe({
      next: response => {
        if (!response?.success || !Array.isArray(response.data)) {
          console.error('Unable to load the user department for the sidebar.');
          return;
        }

        this.departmentName = response.data.find(
          department => Number(department.department_id) === departmentId
        )?.department_name ?? '';
      },
      error: error => {
        console.error('Failed to load the user department for the sidebar:', error);
      }
    });
  }

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  closeAfterNavigation(): void {
    if (window.innerWidth > 1024) return;

    this.collapsed = true;
    this.collapsedChange.emit(true);
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

  get profileImageUrl(): string | null {
    const image = this.user?.profile_image;
    if (!image) return null;
    if (/^https?:\/\//i.test(image)) return image;

    return `${this.apiBase}/storage/${image.replace(/^\/+/, '')}`;
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}