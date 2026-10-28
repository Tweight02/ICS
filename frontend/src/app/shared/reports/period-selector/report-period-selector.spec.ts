import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportPeriodSelector } from './report-period-selector';

describe('ReportPeriodSelector', () => {
  let fixture: ComponentFixture<ReportPeriodSelector>;
  let component: ReportPeriodSelector;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportPeriodSelector]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportPeriodSelector);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('years', [2025, 2026]);
    fixture.componentRef.setInput('quarters', [
      { quarter_id: 1, quarter: 'Q1', year: 2026 },
      { quarter_id: 2, quarter: 'Q2', year: 2026 }
    ]);
    fixture.componentRef.setInput('selectedYear', 2026);
    fixture.componentRef.setInput('selectedQuarterId', 1);
    fixture.detectChanges();
  });

  it('marks the active quarter and emits quarter and annual selections', () => {
    const selectedQuarter = vi.fn();
    const selectedAnnual = vi.fn();
    component.quarterSelected.subscribe(selectedQuarter);
    component.annualSelected.subscribe(selectedAnnual);

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');

    buttons[1].click();
    buttons[2].click();

    expect(selectedQuarter).toHaveBeenCalledWith({
      quarter_id: 2,
      quarter: 'Q2',
      year: 2026
    });
    expect(selectedAnnual).toHaveBeenCalledOnce();
  });

  it('shows selected quarter status inline with the quarter controls as plain text', () => {
    fixture.componentRef.setInput('status', 'approved');
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[data-testid="period-status"]') as HTMLSpanElement | null;
    expect(fixture.nativeElement.textContent).toContain('Approved');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.className).toContain('border-l');
    expect(status?.className).not.toContain('rounded');
    expect(status?.className).not.toContain('bg-');
    expect(status?.parentElement?.className).toContain('rounded-lg border');
  });
});
