import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportParticulars } from './report-particulars';

describe('ReportParticulars', () => {
  let component: ReportParticulars;
  let fixture: ComponentFixture<ReportParticulars>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportParticulars],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportParticulars);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
