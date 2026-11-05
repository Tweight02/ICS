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

  it('shows approved and endorsed states on their corresponding quarter controls', () => {
    fixture.componentRef.setInput('quarterStatuses', { 1: 'approved', 2: 'endorsed' });
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].getAttribute('aria-label')).toBe('Q1, approved');
    expect(buttons[0].querySelector('.bi-check-circle-fill')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Q1 approved"] .bi-check-circle-fill')).not.toBeNull();

    const endorsedStatus = fixture.nativeElement.querySelector('[aria-label="Q2 endorsed"]') as HTMLSpanElement | null;
    expect(endorsedStatus?.textContent).toContain('Endorsed');
    expect(endorsedStatus?.querySelector('i')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="period-status"]')).toBeNull();
  });

  it('can hide the year selector while keeping quarter controls visible', () => {
    fixture.componentRef.setInput('showYear', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[aria-label="Reporting year"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(3);
  });
});
