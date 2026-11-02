import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/services/auth/auth-service';
import { ChurchService } from '../../../core/services/church/church-service';
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
        },
        {
          provide: ChurchService,
          useValue: {
            getDepartments: () => of({
              success: true,
              data: [{ department_id: 16, department_name: 'Ministerial & Evangelism' }]
            })
          }
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

  it('closes the sidebar after navigation on compact screens', () => {
    const collapsedChange = vi.fn();
    const originalWidth = window.innerWidth;
    component.collapsedChange.subscribe(collapsedChange);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    component.closeAfterNavigation();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });

    expect(component.collapsed).toBe(true);
    expect(collapsedChange).toHaveBeenCalledWith(true);
  });

  it('displays the assigned department beneath the user name', async () => {
    fixture.componentRef.setInput('user', {
      user_id: 1,
      first_name: 'Amina',
      last_name: 'Assistant',
      email: 'amina@example.com',
      role: 'assistant',
      department_id: 16
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const profileText = fixture.nativeElement.querySelector('footer a').textContent;
    expect(profileText).toContain('Amina Assistant');
    expect(profileText).toContain('Ministerial & Evangelism');
  });
});
