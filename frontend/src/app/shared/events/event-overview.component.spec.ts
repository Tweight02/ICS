import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { EventService } from '../../core/services/events/events-api';
import { EventOverviewComponent } from './event-overview.component';

describe('EventOverviewComponent', () => {
  let fixture: ComponentFixture<EventOverviewComponent>;
  let getParticipantsByEvent: ReturnType<typeof vi.fn>;
  let getEventRegistrationLink: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getParticipantsByEvent = vi.fn();
    getEventRegistrationLink = vi.fn().mockReturnValue(of({
      church_id: 9,
      registration_token: 'signed-token',
    }));

    await TestBed.configureTestingModule({
      imports: [EventOverviewComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '8' }),
            },
          },
        },
        {
          provide: EventService,
          useValue: {
            getEventById: () => of({
              id: 8,
              title: 'Completed event',
              host_church_name: 'North Local Church',
              created_by: 'District Pastor',
              abilities: { confirm_participants: true },
              participants: { total: 50, confirmed: 50, pending: 0 },
              programs: [],
            }),
            getParticipantsByEvent,
            getEventRegistrationLink,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventOverviewComponent);
    fixture.componentRef.setInput('config', {
      basePath: '/representative/events',
      crumbRoot: 'My Events',
      eyebrow: 'Event',
      subtitle: '',
      backLabel: 'Back',
      canManage: false,
      organizerFallback: '',
    });
    fixture.detectChanges();
  });

  it('displays the event-wide participant totals instead of a paginated page count', () => {
    const text = fixture.nativeElement.textContent;

    expect(fixture.componentInstance.stats).toEqual({
      total: 50,
      confirmed: 50,
      pending: 0,
    });
    expect(text).toContain('50');
    expect(text).toContain('Listed');
    expect(text).toContain('Confirmed');
    expect(text).toContain('0');
    expect(text).toContain('Pending');
    expect(text).toContain('Host church');
    expect(text).toContain('North Local Church');
    expect(getParticipantsByEvent).not.toHaveBeenCalled();
  });

  it('keeps church registration attribution in the link fragment instead of the query string', () => {
    const component = fixture.componentInstance;

    component.generateRegistrationLink();

    const link = new URL(component.registrationLink);
    const attribution = new URLSearchParams(link.hash.slice(1));
    expect(link.searchParams.get('event')).toBe('8');
    expect(link.searchParams.has('registration_token')).toBe(false);
    expect(link.searchParams.has('church_id')).toBe(false);
    expect(attribution.get('church_id')).toBe('9');
    expect(attribution.get('registration_token')).toBe('signed-token');
  });

  it('hides the registration link and prevents generating one for completed events', () => {
    const component = fixture.componentInstance;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().slice(0, 10);
    component.event = {
      ...component.event,
      start_date: yesterdayString,
      end_date: yesterdayString,
    };
    fixture.detectChanges();

    expect(component.status).toBe('Past');
    expect(component.canShareRegistrationLink).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Participant registration link');
    expect(fixture.nativeElement.textContent).not.toContain('Generate church registration link');

    component.generateRegistrationLink();
    expect(getEventRegistrationLink).not.toHaveBeenCalled();
  });
});
