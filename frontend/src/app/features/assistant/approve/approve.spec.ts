import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Approve } from './approve';

describe('Approve', () => {
  let component: Approve;
  let fixture: ComponentFixture<Approve>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Approve],
    }).compileComponents();

    fixture = TestBed.createComponent(Approve);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
