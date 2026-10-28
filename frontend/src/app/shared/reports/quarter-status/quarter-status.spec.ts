import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuarterStatus, resolveQuarterStatus } from './quarter-status';

describe('QuarterStatus', () => {
  let fixture: ComponentFixture<QuarterStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuarterStatus]
    }).compileComponents();

    fixture = TestBed.createComponent(QuarterStatus);
  });

  it('renders the approved state with a check mark', () => {
    fixture.componentRef.setInput('label', 'Approved');
    fixture.componentRef.setInput('tone', 'approved');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('✓');
    expect(fixture.nativeElement.textContent).toContain('Approved');
  });

  it('renders submitted status labels without progress percentages', () => {
    fixture.componentRef.setInput('label', 'Submitted for review');
    fixture.componentRef.setInput('tone', 'submitted');
    fixture.componentRef.setInput('progress', 75);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Submitted for review');
    expect(fixture.nativeElement.textContent).not.toContain('%');
  });

  it('renders a dash for empty status and shows progress only when enabled', () => {
    fixture.componentRef.setInput('tone', 'empty');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('-');

    fixture.componentRef.setInput('tone', 'in-progress');
    fixture.componentRef.setInput('progress', 50);
    fixture.componentRef.setInput('showProgress', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('50%');
  });

  it('resolves quarter monitoring data into consistent report labels', () => {
    expect(resolveQuarterStatus({ progress: null, approved: false, submitted: false }))
      .toEqual({ label: '-', tone: 'empty' });
    expect(resolveQuarterStatus({ progress: 40, approved: false, submitted: true }))
      .toEqual({ label: 'Submitted for review', tone: 'submitted' });
    expect(resolveQuarterStatus({ progress: 100, approved: true, submitted: false }))
      .toEqual({ label: 'Approved', tone: 'approved' });
    expect(resolveQuarterStatus({ progress: 100, approved: false, submitted: false }))
      .toEqual({ label: 'Ready to submit', tone: 'ready' });
  });
});
