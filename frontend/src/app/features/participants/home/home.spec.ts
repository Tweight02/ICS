import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Home } from './home';
import { EventService } from '../../../core/services/events/events-api';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        {
          provide: EventService,
          useValue: {
            getPublicEvents: () => of([{
              id: 42,
              title: 'Database Event',
              location: 'Central Church',
              start_date: '2026-11-10',
              end_date: '2026-11-10',
              start_time: '09:00',
              end_time: '11:00',
              description: 'Saved event',
              church_name: 'North District',
              scope: ['North District'],
            }]),
          },
        },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load event cards from the public events API', () => {
    expect(component.events().length).toBe(1);
    expect(component.events()[0].id).toBe(42);
    expect(component.events()[0].title).toBe('Database Event');
  });

  it('should build a registration route with the selected event id', () => {
    expect(component.registrationUrl(42))
      .toBe('/participants/registration?event=42');
  });
});
