import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Monitoring } from './monitoring';

describe('Monitoring', () => {
  let component: Monitoring;
  let fixture: ComponentFixture<Monitoring>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Monitoring],
    }).compileComponents();

    fixture = TestBed.createComponent(Monitoring);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
