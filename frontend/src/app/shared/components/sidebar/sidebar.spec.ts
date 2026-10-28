import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../../core/services/auth/auth-service';
import { SidebarService } from '../../../core/services/sidebar/sidebar';
import { SidebarComponent } from './sidebar';

describe('Sidebar', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout: vi.fn() } },
        {
          provide: SidebarService,
          useValue: { getMenu: () => [], getRoleName: () => 'User' }
        }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits the new state when the collapse control is toggled', () => {
    const collapsedChange = vi.fn();
    component.collapsedChange.subscribe(collapsedChange);

    component.toggleSidebar();

    expect(component.collapsed).toBe(true);
    expect(collapsedChange).toHaveBeenCalledWith(true);
  });
});
