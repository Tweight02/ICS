import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { EventService } from '../../core/services/events/events-api';
import { EventOverviewComponent } from './event-overview.component';

describe('EventOverviewComponent', () => {
  let fixture: ComponentFixture<EventOverviewComponent>;
  let getParticipantsByEvent: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    getParticipantsByEvent = vi.fn();

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
              participants: { total: 50, confirmed: 50, pending: 0 },
              programs: [],
            }),
            getParticipantsByEvent,
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
    expect(getParticipantsByEvent).not.toHaveBeenCalled();
  });
});
