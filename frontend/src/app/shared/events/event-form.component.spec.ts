import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { NEVER } from 'rxjs';
import { AuthService } from '../../core/services/auth/auth-service';
import { EventService } from '../../core/services/events/events-api';
import { EventFormComponent } from './event-form.component';

describe('EventFormComponent', () => {
  let fixture: ComponentFixture<EventFormComponent>;
  let component: EventFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventFormComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => null }
            }
          }
        },
        { provide: HttpClient, useValue: {} },
        {
          provide: EventService,
          useValue: { getAuthenticatedUser: () => NEVER }
        },
        {
          provide: AuthService,
          useValue: { getCurrentUser: () => ({ user_id: 1, role: 'assistant', department_id: 16 }) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventFormComponent);
    component = fixture.componentInstance;
    component.config = {
      basePath: '/events',
      crumbRoot: 'Events',
      coverage: 'church',
      subtitleCreate: ''
    };
    fixture.detectChanges();
  });

  it('aligns each particular checkbox with its text', () => {
    component.deptId = 16;
    component.programs = [{
      program_id: 1,
      department_id: 16,
      program_name: 'Adventist Youth',
      parent_id: null,
      particulars: [{
        particular_id: 1,
        program_id: 1,
        particular_name: 'Estimated number of SDA youth ages 6-14 years'
      }]
    }];
    component.selectedParticularIds = [1];
    fixture.detectChanges();

    const checkboxes = fixture.nativeElement.querySelectorAll(
      'input[type="checkbox"]'
    ) as NodeListOf<HTMLInputElement>;

    expect(checkboxes.length).toBe(1);
    expect(checkboxes[0].classList.contains('mt-1')).toBe(true);
  });

  it('closes the host church dropdown when clicking outside it', () => {
    component.config = {
      ...component.config,
      coverage: 'churches'
    };
    component.step = 2;
    component.churches = [{ id: 1, name: 'Burgos', selected: true }];
    fixture.detectChanges();

    const hostChurchButton = fixture.nativeElement.querySelector(
      '[aria-label="Host church"]'
    ) as HTMLButtonElement;
    hostChurchButton.click();
    fixture.detectChanges();

    expect(component.hostChurchDropdownOpen).toBe(true);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(component.hostChurchDropdownOpen).toBe(false);
    expect(fixture.nativeElement.querySelector('#host-church-options')).toBeNull();
  });

  it('uses the mission as the automatic host for mission-wide events', () => {
    component.config = {
      ...component.config,
      coverage: 'mission'
    };
    component.step = 2;
    fixture.detectChanges();

    const hostInput = fixture.nativeElement.querySelector(
      '[aria-label="Host mission (automatic)"]'
    ) as HTMLInputElement;

    expect(hostInput.value).toBe('Mission');
    expect(component.selectedHostChurchName).toBe('Mission');
    expect(component.hostChurchError()).toBe('');
    expect(fixture.nativeElement.querySelector('[aria-label="Host church"]')).toBeNull();
  });

  it('keeps church checkboxes and labels on the same row', () => {
    component.config = {
      ...component.config,
      coverage: 'churches'
    };
    component.step = 2;
    component.churches = [{ id: 1, name: 'Burgos', sub: 'Isabela, Philippines', selected: true }];
    fixture.detectChanges();

    const churchCard = Array.from(
      fixture.nativeElement.querySelectorAll('label') as NodeListOf<HTMLLabelElement>
    ).find(label => label.textContent?.includes('Burgos'));
    const churchCheckbox = churchCard?.querySelector(
      'input[type="checkbox"]'
    ) as HTMLInputElement | null;
    const churchDetails = churchCard?.querySelector(':scope > span.flex');

    expect(churchCheckbox).not.toBeNull();
    expect(churchCard?.classList.contains('items-center')).toBe(true);
    expect(churchDetails?.classList.contains('items-baseline')).toBe(true);
    expect(churchDetails?.querySelectorAll(':scope > span')).toHaveLength(2);
  });
});
