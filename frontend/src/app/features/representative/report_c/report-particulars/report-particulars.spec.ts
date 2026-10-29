import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import Swal from 'sweetalert2';
import { AuthService } from '../../../../core/services/auth/auth-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ReportService } from '../../../../core/services/report/report';
import { ReportParticulars } from './report-particulars';

describe('ReportParticulars', () => {
  let component: ReportParticulars;
  let fixture: ComponentFixture<ReportParticulars>;
  let saveDepartmentReport: ReturnType<typeof vi.fn>;
  let getDepartmentReport: ReturnType<typeof vi.fn>;
  let addComment: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true
    });

    const report = {
      department: { department_id: 3, department_name: 'Youth' },
      programs: [{
        program_id: 5,
        program_name: 'Program',
        sections: [{
          program_id: 6,
          program_name: 'Section',
          particulars: [
            {
              particular_id: 7,
              particular_name: 'Attendance',
              quarters: [{
                quarter_id: 9,
                quarter: 'Q1',
                year: 2026,
                value: null,
                mission_approve: null
              }]
            },
            {
              particular_id: 8,
              particular_name: 'Outreach',
              quarters: [{
                quarter_id: 9,
                quarter: 'Q1',
                year: 2026,
                value: null,
                mission_approve: null
              }]
            }
          ]
        }, {
          program_id: 10,
          program_name: 'BIBLE WORKERS',
          particulars: []
        }]
      }, {
        program_id: 11,
        program_name: 'Youth Ministries',
        sections: [{
          program_id: 12,
          program_name: 'Youth Ministries',
          particulars: [{
            particular_id: 13,
            particular_name: 'Youth Attendance',
            quarters: [{
              quarter_id: 19,
              quarter: 'Q1',
              year: 2026,
              value: null,
              mission_approve: null
            }]
          }]
        }]
      }]
    };

    getDepartmentReport = vi.fn().mockReturnValue(of(report));
    saveDepartmentReport = vi.fn().mockReturnValue(of({ message: 'Report submitted.' }));
    addComment = vi.fn().mockReturnValue(of({
      message: 'Comment added successfully.',
      data: {
        comment_id: 12,
        quarter_id: 9,
        church_id: 2,
        department_id: 3,
        commented_by: 7,
        details: 'I will complete the remaining items.',
        date_commented: '2026-10-21',
        commenter_name: 'Casey Representative',
        commenter_role: 'representative',
        quarter: 'Q1',
        year: '2026'
      }
    }));
    const getAllChurches = vi.fn().mockReturnValue(of({
      success: true,
      data: [
        { church_id: 1, name: 'Batanes', address: null, parent_id: null },
        { church_id: 2, name: 'Pasuc', address: null, parent_id: 1 }
      ]
    }));

    await TestBed.configureTestingModule({
      imports: [ReportParticulars],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ departmentId: '3' })),
            snapshot: { queryParamMap: convertToParamMap({}) }
          }
        },
        { provide: AuthService, useValue: { getCurrentUser: () => ({ church_id: 1, user_id: 7, role: 'representative' }) } },
        { provide: ChurchService, useValue: { getAllChurches } },
        {
          provide: ReportService,
          useValue: {
            getDepartmentReport,
            getDepartmentComments: () => of({ data: [] }),
            saveDepartmentReport,
            addComment
          }
        },
        { provide: Router, useValue: { navigate: vi.fn(), url: '/representative/reports/particulars/3' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportParticulars);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not show the confirmed participant label in report inputs', () => {
    const record = component.report!.programs[0].sections[0].particulars[0].quarters[0];
    record.participant_count = 1;
    record.value = 1;
    record.combined_value = 1;

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Includes 1 confirmed participant');
  });

  it('keeps program selectors unfilled while identifying the selected program', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const programButton = Array.from(buttons)
      .find(button => button.textContent.trim() === 'Program')!;

    expect(programButton.getAttribute('aria-pressed')).toBe('true');
    expect(programButton.classList.contains('bg-emerald-700')).toBe(false);
    expect(programButton.classList.contains('shadow-md')).toBe(false);
  });

  it('hides the saved confirmation after five seconds', () => {
    vi.useFakeTimers();
    component.autoSaveStatus = 'saved';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('All changes saved');

    vi.advanceTimersByTime(4999);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('All changes saved');

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('All changes saved');
    vi.useRealTimers();
  });

  it('hides the already-approved warning after five seconds', () => {
    vi.useFakeTimers();
    component.report!.programs[0].program_name = 'AY Quarterly Report';
    for (const particular of component.report!.programs[0].sections[0].particulars) {
      particular.quarters[0].mission_approve = '2026-10-28';
    }

    component.saveReport();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent)
      .toContain('The Q1 report for AY Quarterly Report has already been approved.');

    vi.advanceTimersByTime(4999);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent)
      .toContain('The Q1 report for AY Quarterly Report has already been approved.');

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent)
      .not.toContain('The Q1 report for AY Quarterly Report has already been approved.');
    vi.useRealTimers();
  });

  it('shows stewardship and offering sections together in one report view', () => {
    component.departmentId = 14;
    component.report!.department!.department_id = 14;
    component.report!.programs[0].sections = [
      {
        program_id: 21,
        program_name: 'STEWARDSHIP',
        particulars: [{
          particular_id: 22,
          particular_name: 'No. of Church Members',
          quarters: [{ quarter_id: 9, quarter: 'Q1', year: 2026, value: 40, mission_approve: null }]
        }]
      },
      {
        program_id: 23,
        program_name: 'OFFERING AND TITHES',
        particulars: [
          {
            particular_id: 24,
            particular_name: 'Offering',
            quarters: [{
              quarter_id: 9,
              quarter: 'Q1',
              year: 2026,
              value: 1200,
              monthly_values: { January: 100, February: 400, March: 700 },
              mission_approve: null
            }]
          },
          {
            particular_id: 25,
            particular_name: 'Tithes',
            quarters: [{ quarter_id: 9, quarter: 'Q1', year: 2026, value: 3400, mission_approve: null }]
          }
        ]
      }
    ];

    const program = component.getSelectedProgram()!;
    expect(component.isStewardshipReport).toBe(true);
    expect(component.getVisibleSections(program).map(section => section.program_name))
      .toEqual(['STEWARDSHIP', 'OFFERING AND TITHES']);

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('STEWARDSHIP');
    expect(fixture.nativeElement.textContent).toContain('OFFERING AND TITHES');
    expect(fixture.nativeElement.querySelector('[role="tablist"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Total Offering');
    expect(fixture.nativeElement.textContent).toContain('Total Tithes');
    expect(component.getStewardshipTotal('offering')).toBe(1200);
    expect(component.getStewardshipTotal('tithe')).toBe(3400);
    expect(component.getQuarterMonthNames(component.getSelectedQuarter()!))
      .toEqual(['January', 'February', 'March']);
    expect(fixture.nativeElement.textContent).toContain('January');
    expect(fixture.nativeElement.querySelectorAll('details[open]')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('input[type="number"]')).toHaveLength(7);
  });

  it('loads and saves reports for the local church assigned to the representative district', () => {
    expect(getDepartmentReport).toHaveBeenCalledWith(2, 3);

    component.saveReport();

    expect(saveDepartmentReport.mock.calls[0][0]).toBe(2);
  });

  it('submits every program and fills untouched items with zero', () => {
    component.saveReport();

    expect(saveDepartmentReport).toHaveBeenCalledOnce();
    expect(saveDepartmentReport.mock.calls[0][2]).toEqual([
      { particular_id: 7, quarter_id: 9, value: 0, value_includes_participants: true },
      { particular_id: 8, quarter_id: 9, value: 0, value_includes_participants: true },
      { particular_id: 13, quarter_id: 19, value: 0, value_includes_participants: true }
    ]);
    expect(saveDepartmentReport.mock.calls[0][3]).toBe(true);
  });

  it('blocks submission until every item in the previous quarter is approved', () => {
    const programs = component.report!.programs;
    programs.forEach((program, programIndex) => {
      for (const section of program.sections) {
        for (const particular of section.particulars) {
          particular.quarters.push({
            quarter_id: 20 + programIndex,
            quarter: 'Q2',
            year: 2026,
            value: null,
            mission_approve: null
          });
        }
      }
    });
    component.availableQuarters = [
      { quarter_id: 9, quarter: 'Q1', year: 2026 },
      { quarter_id: 20, quarter: 'Q2', year: 2026 }
    ];
    component.selectedQuarterId = 20;
    fixture.detectChanges();

    expect(component.canSubmitSelectedQuarter()).toBe(false);
    const submitButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent.includes('Submit report'));
    expect(submitButton?.disabled).toBe(true);
    expect(fixture.nativeElement.textContent)
      .toContain('The previous quarter must be approved before submitting this report.');
    component.saveReport();
    expect(saveDepartmentReport).not.toHaveBeenCalled();
    expect(component.errorMessage)
      .toBe('The previous quarter must be approved before submitting this report.');

    for (const program of programs) {
      for (const section of program.sections) {
        for (const particular of section.particulars) {
          particular.quarters[0].mission_approve = '2026-03-01';
        }
      }
    }

    expect(component.canSubmitSelectedQuarter()).toBe(true);
    component.saveReport();
    expect(saveDepartmentReport).toHaveBeenCalledOnce();
  });

  it('requires the prior year Q4 to be approved before Q1 when that report exists', () => {
    component.report!.programs.forEach((program, programIndex) => {
      for (const section of program.sections) {
        for (const particular of section.particulars) {
          particular.quarters.push({
            quarter_id: 30 + programIndex,
            quarter: 'Q4',
            year: 2025,
            value: null,
            mission_approve: null
          });
        }
      }
    });
    component.availableQuarters = [
      { quarter_id: 30, quarter: 'Q4', year: 2025 },
      { quarter_id: 9, quarter: 'Q1', year: 2026 }
    ];
    component.selectedYear = 2026;
    component.selectedQuarterId = 9;

    expect(component.canSubmitSelectedQuarter()).toBe(false);

    for (const program of component.report!.programs) {
      for (const section of program.sections) {
        for (const particular of section.particulars) {
          particular.quarters[1].mission_approve = '2025-12-01';
        }
      }
    }

    expect(component.canSubmitSelectedQuarter()).toBe(true);
  });

  it('preserves values already entered in another program when submitting', () => {
    component.report!.programs[1].sections[0].particulars[0].quarters[0].value = 6;

    component.saveReport();

    expect(saveDepartmentReport.mock.calls[0][2]).toContainEqual({
      particular_id: 13,
      quarter_id: 19,
      value: 6,
      value_includes_participants: true
    });
  });

  it('shows the participant-inclusive total and prevents lowering it below confirmed participants', () => {
    const report = {
      department: { department_id: 3, department_name: 'Youth' },
      programs: [{
        program_id: 5,
        program_name: 'Program',
        sections: [{
          program_id: 6,
          program_name: 'Section',
          particulars: [
            {
              particular_id: 7,
              particular_name: 'Attendance',
              quarters: [{
                quarter_id: 9,
                quarter: 'Q1',
                year: 2026,
                value: 6,
                participant_count: 1,
                combined_value: 7,
                mission_approve: null
              }]
            },
            {
              particular_id: 8,
              particular_name: 'Outreach',
              quarters: [{
                quarter_id: 9,
                quarter: 'Q1',
                year: 2026,
                value: null,
                participant_count: 0,
                combined_value: null,
                mission_approve: null
              }]
            }
          ]
        }]
      }]
    };
    getDepartmentReport.mockReturnValue(of(report));
    component.loadReport();

    const particular = component.report!.programs[0].sections[0].particulars[0];
    const quarter = component.getSelectedQuarter()!;
    const record = particular.quarters[0];
    expect(record.value).toBe(7);

    component.setQuarterValue(particular, quarter, 0);
    expect(record.value).toBe(1);

    component.saveReport();
    expect(saveDepartmentReport.mock.calls[0][2]).toContainEqual({
      particular_id: 7,
      quarter_id: 9,
      value: 1,
      value_includes_participants: true
    });
  });

  it('opens the first section by default and allows multiple sections to stay open', () => {
    const accordions = Array.from(
      fixture.nativeElement.querySelectorAll('details')
    ) as HTMLDetailsElement[];
    const [details, nextDetails] = accordions;
    const summary = details.querySelector('summary') as HTMLElement;

    expect(summary.textContent).toContain('Section');
    expect(summary.querySelector('.report-accordion-indicator')).not.toBeNull();
    expect(details.open).toBe(true);
    expect(nextDetails.open).toBe(false);
    expect(details.querySelectorAll('input[type="number"]')).toHaveLength(2);

    (nextDetails.querySelector('summary') as HTMLElement).click();
    fixture.detectChanges();

    expect(details.open).toBe(true);
    expect(nextDetails.open).toBe(true);
  });

  it('marks a section incomplete until every particular has a quarter value', () => {
    const section = component.report!.programs[0].sections[0];

    expect(component.isSectionDataComplete(section)).toBe(false);

    section.particulars[0].quarters[0].value = 0;
    section.particulars[1].quarters[0].value = 12;

    expect(component.isSectionDataComplete(section)).toBe(true);
  });

  it('sends a representative reply and displays it as an outgoing message', () => {
    component.comments = [{
      comment_id: 11,
      quarter_id: 9,
      commented_by: 8,
      details: 'Please finish the remaining report items.',
      date_commented: '2026-10-20',
      commenter_name: 'District Pastor',
      commenter_role: 'pastor'
    }];
    component.commentDraft = '  I will complete the remaining items.  ';

    component.submitComment();

    expect(addComment).toHaveBeenCalledWith(
      9,
      2,
      3,
      'I will complete the remaining items.'
    );
    expect(component.commentDraft).toBe('');
    expect(component.comments).toHaveLength(2);
    expect(component.isOwnComment(component.comments[0])).toBe(false);
    expect(component.isOwnComment(component.comments[1])).toBe(true);
  });

  it('requires a previous quarter comment before a representative can reply', () => {
    expect(component.canReplyToComments()).toBe(false);

    component.comments = [{
      comment_id: 11,
      quarter_id: 9,
      commented_by: 8,
      details: 'Please finish the remaining report items.',
      date_commented: '2026-10-20',
      commenter_role: 'pastor'
    }];

    expect(component.canReplyToComments()).toBe(true);
  });

  it('opens and closes the mobile comments chathead panel', () => {
    expect(component.mobileCommentsOpen).toBe(false);

    component.openMobileComments();
    expect(component.mobileCommentsOpen).toBe(true);

    component.closeMobileComments();
    expect(component.mobileCommentsOpen).toBe(false);
  });

  it('closes the comments panel when clicking outside it', () => {
    component.openMobileComments();
    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector(
      '[data-testid="comments-backdrop"]'
    ) as HTMLButtonElement;
    expect(backdrop).toBeTruthy();

    backdrop.click();
    fixture.detectChanges();

    expect(component.mobileCommentsOpen).toBe(false);
  });

  it('scrolls to the latest visible comment when opening the chathead', () => {
    component.comments = [{
      comment_id: 11,
      quarter_id: 9,
      commented_by: 8,
      details: 'Latest message',
      date_commented: '2026-10-20'
    }];
    fixture.detectChanges();

    const messageList = fixture.nativeElement.querySelector('ul') as HTMLUListElement;
    Object.defineProperty(messageList, 'scrollHeight', { configurable: true, value: 480 });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    component.openMobileComments();

    expect(messageList.scrollTop).toBe(480);
    vi.unstubAllGlobals();
  });

  it('prevents representative replies after the selected quarter is approved', () => {
    const particulars = component.report!.programs[0].sections[0].particulars;
    particulars.forEach(particular => {
      particular.quarters[0].mission_approve = '2026-10-21';
    });
    component.commentDraft = 'This reply should not send.';

    expect(component.canReplyToComments()).toBe(false);
    component.submitComment();

    expect(addComment).not.toHaveBeenCalled();
  });

  it('does not mark a quarter approved until every particular is approved', () => {
    const particulars = component.report!.programs[0].sections[0].particulars;
    particulars[0].quarters[0].mission_approve = '2026-10-21';

    expect(component.isQuarterApproved(9)).toBe(false);

    particulars[1].quarters[0].mission_approve = '2026-10-21';

    expect(component.isQuarterApproved(9)).toBe(true);
  });

  it('keeps approved quarter values visible in disabled inputs', async () => {
    const particulars = component.report!.programs[0].sections[0].particulars;
    const details = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    details.open = true;
    for (const [index, particular] of particulars.entries()) {
      particular.quarters[0].value = index === 0 ? 15 : 0;
      particular.quarters[0].mission_approve = '2026-10-13';
    }

    fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

    expect(component.isQuarterApproved(9)).toBe(true);
    const inputs = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="number"]')
    ) as HTMLInputElement[];

    expect(inputs.map(input => input.value)).toEqual(['15', '0']);
    expect(inputs.every(input => input.disabled)).toBe(true);
  });

  it('shows the endorsement state only when every particular in the selected program is endorsed', () => {
    const particulars = component.report!.programs[0].sections[0].particulars;
    particulars[0].quarters[0].district_endorse = '2026-10-13';

    expect(component.isQuarterEndorsed(9)).toBe(false);

    particulars[1].quarters[0].district_endorse = '2026-10-13';
    expect(component.isQuarterEndorsed(9)).toBe(true);

    particulars[0].quarters[0].mission_approve = '2026-10-14';
    expect(component.isQuarterEndorsed(9)).toBe(false);
  });
});
