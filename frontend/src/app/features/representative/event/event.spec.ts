import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Event } from './event';

describe('Event', () => {
  let component: Event;
  let fixture: ComponentFixture<Event>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Event],
    }).compileComponents();

    fixture = TestBed.createComponent(Event);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
