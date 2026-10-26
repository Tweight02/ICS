import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { EventService } from '../../../core/services/events/events-api';
import { Registration } from './registration';

describe('Registration', () => {
  let component: Registration;
  let fixture: ComponentFixture<Registration>;
  let getPublicEventById: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const queryParams = new Map([
      ['event', '42'],
      ['church_id', '9'],
      ['registration_token', 'signed-token'],
    ]);
    getPublicEventById = vi.fn().mockReturnValue(of({
      id: 42,
      title: 'Community Event',
      start_date: '2026-11-10',
      end_date: '2026-11-10',
      start_time: '09:00',
      end_time: '11:00',
      location: 'Church',
      registration_church_name: 'North Local Church',
    }));

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
            },
          },
        },
        {
          provide: EventService,
          useValue: { getPublicEventById },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Registration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the selected event using church attribution from the registration link', () => {
    expect(component.selectedEvent?.id).toBe(42);
    expect(component.selectedEvent?.church).toBe('North Local Church');
    expect(getPublicEventById).toHaveBeenCalledWith(42, {
      church_id: 9,
      registration_token: 'signed-token',
    });
  });
});
