import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportPrograms } from './report-programs';

describe('ReportPrograms', () => {
  let component: ReportPrograms;
  let fixture: ComponentFixture<ReportPrograms>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportPrograms],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportPrograms);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
