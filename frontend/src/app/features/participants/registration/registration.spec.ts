import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Registration } from './registration';

describe('Registration', () => {
  let component: Registration;
  let fixture: ComponentFixture<Registration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Registration]
    }).compileComponents();

    fixture = TestBed.createComponent(Registration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should resolve a selected event from the query string', () => {
    const params = new URLSearchParams({ event: 'leadership-communication-2026' });
    spyOn(window, 'location', 'get').and.returnValue({ search: `?${params.toString()}` } as Location);

    component.ngOnInit();

    expect(component.selectedEvent?.id).toBe('leadership-communication-2026');
  });
});
