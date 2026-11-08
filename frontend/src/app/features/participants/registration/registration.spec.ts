import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import * as appAlertModule from '../../../shared/utils/app-alert';
import { EventService } from '../../../core/services/events/events-api';
import { Registration } from './registration';

describe('Registration', () => {
  let component: Registration;
  let fixture: ComponentFixture<Registration>;
  let getPublicEventById: ReturnType<typeof vi.fn>;
  let registerPublicParticipant: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const queryParams = new Map([
      ['event', '42'],
    ]);
    navigateByUrl = vi.fn().mockResolvedValue(true);
    getPublicEventById = vi.fn().mockReturnValue(of({
      id: 42,
      title: 'Community Event',
      start_date: '2026-11-10',
      end_date: '2026-11-10',
      start_time: '09:00',
      end_time: '11:00',
      location: 'Church',
      host_church_name: 'North Local Church',
      registration_church_name: 'North Local Church',
    }));
    registerPublicParticipant = vi.fn();

    await TestBed.configureTestingModule({
      imports: [Registration],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => queryParams.get(key) ?? null,
              },
              fragment: 'church_id=9&registration_token=signed-token',
            },
          },
        },
        { provide: Router, useValue: { navigateByUrl } },
        { provide: Location, useValue: { getState: () => null } },
        {
          provide: EventService,
          useValue: { getPublicEventById, registerPublicParticipant },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Registration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the selected event using church attribution from the registration link', () => {
    expect(component.selectedEvent?.id).toBe(42);
    expect(component.selectedEvent?.registrationChurch).toBe('North Local Church');
    expect(component.selectedEvent?.host).toBe('North Local Church');
    expect(getPublicEventById).toHaveBeenCalledWith(42, {
      church_id: 9,
      registration_token: 'signed-token',
    });
    expect(navigateByUrl).toHaveBeenCalledWith(
      '/participants/registration?event=42',
      {
        replaceUrl: true,
        state: {
          registrationAttribution: {
            church_id: 9,
            registration_token: 'signed-token',
          },
        },
      }
    );
  });

  it('shows a sweet alert when registration submission fails', async () => {
    const alertSpy = vi.spyOn(appAlertModule, 'showAppAlert').mockResolvedValue({} as never);
    component.selectedEvent = {
      id: 42,
      title: 'Community Event',
      church: 'North Local Church',
      registrationChurch: 'North Local Church',
      createdBy: 'Pastor',
      host: 'North Local Church',
      date: 'Nov 10, 2026',
      time: '09:00',
      end: '11:00',
      venue: 'Main Hall',
      description: 'Community event',
    };
    component.eventId = 42;
    component.formData = {
      first_name: 'Jane',
      last_name: 'Doe',
      middle_name: '',
      extension_name: '',
      age: '28',
      gender: 'female',
    };
    registerPublicParticipant.mockReturnValue(Promise.reject({
      status: 422,
      error: { errors: { first_name: ['First name is required.'] } },
    }) as never);

    await component.onSubmit({ invalid: false, form: { markAllAsTouched: vi.fn() } } as any);

    expect(registerPublicParticipant).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'error',
      title: 'Registration failed',
      text: 'First name is required.',
    }));
  });

  it('shows a sweet alert when registration succeeds', async () => {
    const alertSpy = vi.spyOn(appAlertModule, 'showAppAlert').mockResolvedValue({} as never);
    component.selectedEvent = {
      id: 42,
      title: 'Community Event',
      church: 'North Local Church',
      registrationChurch: 'North Local Church',
      createdBy: 'Pastor',
      host: 'North Local Church',
      date: 'Nov 10, 2026',
      time: '09:00',
      end: '11:00',
      venue: 'Main Hall',
      description: 'Community event',
    };
    component.eventId = 42;
    component.formData = {
      first_name: 'Jane',
      last_name: 'Doe',
      middle_name: '',
      extension_name: '',
      age: '28',
      gender: 'female',
    };
    registerPublicParticipant.mockReturnValue(Promise.resolve({
      id: 88,
      reference: 'REF-1001',
      saved_at: '2026-11-05T12:00:00Z',
    }) as never);

    await component.onSubmit({ invalid: false, form: { markAllAsTouched: vi.fn() } } as any);

    expect(registerPublicParticipant).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'success',
      title: 'Registration successful',
      text: 'Jane Doe has been registered for Community Event.',
    }));
  });
});
