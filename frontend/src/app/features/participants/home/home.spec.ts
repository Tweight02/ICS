import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home]
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose event cards for registration', () => {
    expect(component.events.length).toBeGreaterThan(0);
    expect(component.events[0].id).toBeTruthy();
  });

  it('should build a registration route with the selected event id', () => {
    expect(component.registrationUrl('leadership-communication-2026'))
      .toBe('/participants/registration?event=leadership-communication-2026');
  });
});
