import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportsDetails } from './reports-details';

describe('ReportsDetails', () => {
  let component: ReportsDetails;
  let fixture: ComponentFixture<ReportsDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
