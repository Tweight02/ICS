import {
  Component,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarItem, SidebarService } from '../../../core/services/sidebar';
import { User, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnChanges {

  @Input() user!: User;

  menuItems: SidebarItem[] = [];

  constructor(
    private sidebarService: SidebarService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      this.menuItems = this.sidebarService.getMenu(this.user.role);
    }
  }

  logout(): void {
    // Connect this to your AuthService later
    console.log('Logout');
  }
}