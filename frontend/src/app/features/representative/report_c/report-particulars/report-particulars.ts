import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  ReportService
} from '../../../../core/services/report/report';

import {
  DepartmentReport,
  Program,
  ProgramSection,
  Particular,
  ReportQuarter,
  SaveReportItem
} from '../../../../core/models/report.model';


@Component({
  selector: 'app-report-particulars',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './report-particulars.html',

  styleUrls: [
    './report-particulars.css'
  ]
})
export class ReportParticulars
  implements OnInit {


  /* =========================================================
     SERVICES
  ========================================================= */

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly reportService =
    inject(ReportService);

  private readonly cdr =
    inject(ChangeDetectorRef);


  /* =========================================================
     CURRENT USER
  ========================================================= */

  private readonly CURRENT_USER = {

    user_id: 1,

    department_id: 1,

    church_id: 214,

    first_name: 'Juan',

    middle_name: 'Santos',

    last_name: 'Dela Cruz',

    extension_name: null,

    birthdate: '1980-05-15',

    gender: 'Male',

    email:
      'district.representative@example.com',

    role: 'representative'
  };


  /* =========================================================
     BASIC INFORMATION
  ========================================================= */

  churchId =
    this.CURRENT_USER.church_id;

  departmentId = 0;


  /* =========================================================
     REPORT DATA
  ========================================================= */

  report:
    DepartmentReport | null = null;


  /* =========================================================
     QUARTERS
  ========================================================= */

  availableQuarters:
    ReportQuarter[] = [];

  selectedQuarterId:
    number | null = null;

  selectedQuarterIndex =
    0;


  /* =========================================================
     UI STATES
  ========================================================= */

  loading =
    false;

  saving =
    false;

  errorMessage =
    '';

  successMessage =
    '';


  /* =========================================================
     INIT
  ========================================================= */

  ngOnInit(): void {

    const id =
      Number(
        this.route.snapshot.paramMap.get(
          'departmentId'
        )
      );

    if (!id || Number.isNaN(id)) {

      this.errorMessage =
        'Invalid department.';

      return;
    }

    this.departmentId =
      id;

    this.loadReport();
  }


  /* =========================================================
     LOAD REPORT
  ========================================================= */

  loadReport(): void {

    this.loading =
      true;

    this.errorMessage =
      '';

    this.successMessage =
      '';

    this.reportService
      .getDepartmentReport(
        this.churchId,
        this.departmentId
      )
      .subscribe({

        next: (response) => {

          console.log(
            'DEPARTMENT REPORT:',
            response
          );

          this.report =
            response;

          this.initializeQuarters();

          this.loading =
            false;

          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'LOAD REPORT ERROR:',
            error
          );

          this.report =
            null;

          this.availableQuarters =
            [];

          this.selectedQuarterId =
            null;

          this.loading =
            false;

          this.errorMessage =
            error?.error?.message ??
            'Unable to load report.';

          this.cdr.detectChanges();
        }

      });
  }


  /* =========================================================
     INITIALIZE QUARTERS
  ========================================================= */

  private initializeQuarters(): void {

    if (!this.report) {

      this.availableQuarters =
        [];

      this.selectedQuarterId =
        null;

      this.selectedQuarterIndex =
        0;

      return;
    }


    const quarterMap =
      new Map<number, ReportQuarter>();


    for (
      const program
      of this.report.programs ?? []
    ) {

      for (
        const section
        of program.sections ?? []
      ) {

        for (
          const particular
          of section.particulars ?? []
        ) {

          for (
            const quarter
            of particular.quarters ?? []
          ) {

            if (
              !quarter ||
              !quarter.quarter_id
            ) {
              continue;
            }


            if (
              !quarterMap.has(
                quarter.quarter_id
              )
            ) {

              quarterMap.set(
                quarter.quarter_id,
                quarter
              );
            }
          }
        }
      }
    }


    this.availableQuarters =
      Array.from(
        quarterMap.values()
      );


    /* =====================================================
       SORT BY YEAR THEN QUARTER
    ===================================================== */

    this.availableQuarters.sort(
      (
        a: ReportQuarter,
        b: ReportQuarter
      ) => {

        const yearA =
          Number(a.year);

        const yearB =
          Number(b.year);


        if (
          yearA !== yearB
        ) {

          return yearA - yearB;
        }


        return (
          this.getQuarterNumber(
            a.quarter
          ) -
          this.getQuarterNumber(
            b.quarter
          )
        );
      }
    );


    /* =====================================================
       ALWAYS START AT Q1
    ===================================================== */

    this.selectedQuarterIndex =
      0;


    if (
      this.availableQuarters.length > 0
    ) {

      this.selectedQuarterId =
        this.availableQuarters[0]
          .quarter_id;

    } else {

      this.selectedQuarterId =
        null;
    }


    console.log(
      'AVAILABLE QUARTERS:',
      this.availableQuarters
    );

    console.log(
      'SELECTED QUARTER:',
      this.selectedQuarterId
    );
  }


  /* =========================================================
     GET QUARTER NUMBER
  ========================================================= */

  private getQuarterNumber(
    quarter: string
  ): number {

    const value =
      String(
        quarter
      ).toUpperCase();


    if (
      value.includes('1')
    ) {
      return 1;
    }

    if (
      value.includes('2')
    ) {
      return 2;
    }

    if (
      value.includes('3')
    ) {
      return 3;
    }

    if (
      value.includes('4')
    ) {
      return 4;
    }


    return 99;
  }


  /* =========================================================
     GET SELECTED QUARTER
  ========================================================= */

  getSelectedQuarter():
    ReportQuarter | null {

    if (
      this.selectedQuarterId === null
    ) {

      return null;
    }


    if (
      this.availableQuarters.length === 0
    ) {

      return null;
    }


    return (
      this.availableQuarters.find(
        (
          quarter: ReportQuarter
        ) =>
          quarter.quarter_id ===
          this.selectedQuarterId
      ) ?? null
    );
  }


  /* =========================================================
     CHECK APPROVAL
  ========================================================= */

  isQuarterApproved(
    quarterId: number | null
  ): boolean {

    if (
      !this.report ||
      quarterId === null
    ) {

      return false;
    }


    for (
      const program
      of this.report.programs ?? []
    ) {

      for (
        const section
        of program.sections ?? []
      ) {

        for (
          const particular
          of section.particulars ?? []
        ) {

          const quarter =
            (
              particular.quarters ?? []
            ).find(
              (
                q: ReportQuarter
              ) =>
                q &&
                q.quarter_id ===
                quarterId
            );


          if (quarter) {

            return (
              quarter.mission_approve !==
                null &&
              quarter.mission_approve !==
                ''
            );
          }
        }
      }
    }


    return false;
  }


  /* =========================================================
     CAN GO TO NEXT QUARTER
  ========================================================= */

  canGoToNextQuarter(): boolean {

    if (
      this.availableQuarters.length === 0
    ) {

      return false;
    }


    if (
      this.selectedQuarterIndex >=
      this.availableQuarters.length - 1
    ) {

      return false;
    }


    const currentQuarter =
      this.getSelectedQuarter();


    if (!currentQuarter) {

      return false;
    }


    return this.isQuarterApproved(
      currentQuarter.quarter_id
    );
  }


  /* =========================================================
     GO TO NEXT QUARTER
  ========================================================= */

  goToNextQuarter(): void {

    if (
      !this.canGoToNextQuarter()
    ) {

      this.errorMessage =
        'The current quarter must be approved before proceeding to the next quarter.';

      this.successMessage =
        '';

      return;
    }


    if (
      this.selectedQuarterIndex <
      this.availableQuarters.length - 1
    ) {

      this.selectedQuarterIndex++;


      this.selectedQuarterId =
        this.availableQuarters[
          this.selectedQuarterIndex
        ].quarter_id;


      this.errorMessage =
        '';

      this.successMessage =
        '';


      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });


      this.cdr.detectChanges();
    }
  }


  /* =========================================================
     GO TO PREVIOUS QUARTER
  ========================================================= */

  goToPreviousQuarter(): void {

    if (
      this.selectedQuarterIndex <= 0
    ) {

      return;
    }


    this.selectedQuarterIndex--;


    this.selectedQuarterId =
      this.availableQuarters[
        this.selectedQuarterIndex
      ].quarter_id;


    this.errorMessage =
      '';

    this.successMessage =
      '';


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });


    this.cdr.detectChanges();
  }


  /* =========================================================
     GET PARTICULAR VALUE
  ========================================================= */

  getQuarterValue(
    particular: Particular,
    quarter: ReportQuarter
  ): number | null {

    if (
      !particular ||
      !quarter
    ) {

      return null;
    }


    const found =
      (
        particular.quarters ?? []
      ).find(
        (
          q: ReportQuarter
        ) =>
          q &&
          q.quarter_id ===
          quarter.quarter_id
      );


    return found?.value ?? null;
  }


  /* =========================================================
     SET PARTICULAR VALUE
  ========================================================= */

  setQuarterValue(
    particular: Particular,
    quarter: ReportQuarter,
    value: string | number | null
  ): void {

    if (
      !particular ||
      !quarter
    ) {

      return;
    }


    /* APPROVED = READ ONLY */

    if (
      this.isQuarterApproved(
        quarter.quarter_id
      )
    ) {

      return;
    }


    const found =
      (
        particular.quarters ?? []
      ).find(
        (
          q: ReportQuarter
        ) =>
          q &&
          q.quarter_id ===
          quarter.quarter_id
      );


    if (!found) {

      return;
    }


    if (
      value === null ||
      value === '' ||
      value === undefined
    ) {

      found.value =
        null;

      return;
    }


    const numericValue =
      Number(value);


    found.value =
      Number.isNaN(
        numericValue
      )
        ? null
        : numericValue;
  }


  /* =========================================================
     SAVE REPORT
  ========================================================= */

  saveReport(): void {

    if (
      !this.report
    ) {

      return;
    }


    if (
      this.saving
    ) {

      return;
    }


    if (
      this.selectedQuarterId === null
    ) {

      this.errorMessage =
        'No quarter is selected.';

      return;
    }


    /* =====================================================
       APPROVED QUARTER CANNOT BE SAVED
    ===================================================== */

    if (
      this.isQuarterApproved(
        this.selectedQuarterId
      )
    ) {

      this.errorMessage =
        'This quarter has already been approved and cannot be modified.';

      this.successMessage =
        '';

      return;
    }


    const items:
      SaveReportItem[] =
      [];


    /* =====================================================
       SAVE ONLY THE SELECTED QUARTER
    ===================================================== */

    for (
      const program
      of this.report.programs ?? []
    ) {

      for (
        const section
        of program.sections ?? []
      ) {

        for (
          const particular
          of section.particulars ?? []
        ) {

          const quarter =
            (
              particular.quarters ?? []
            ).find(
              (
                q: ReportQuarter
              ) =>
                q &&
                q.quarter_id ===
                this.selectedQuarterId
            );


          if (!quarter) {
            continue;
          }


          items.push({

            particular_id:
              particular.particular_id,

            quarter_id:
              quarter.quarter_id,

            value:
              quarter.value
          });
        }
      }
    }


    if (
      items.length === 0
    ) {

      this.errorMessage =
        'There are no report items to save.';

      return;
    }


    this.saving =
      true;

    this.errorMessage =
      '';

    this.successMessage =
      '';


    this.reportService
      .saveDepartmentReport(
        this.churchId,
        this.departmentId,
        items
      )
      .subscribe({

        next: (
          response
        ) => {

          this.saving =
            false;

          this.successMessage =
            response?.message ??
            'Report saved successfully.';

          this.errorMessage =
            '';


          /* REFRESH REPORT */

          this.loadReport();
        },

        error: (
          error
        ) => {

          console.error(
            'SAVE REPORT ERROR:',
            error
          );

          this.saving =
            false;

          this.successMessage =
            '';

          this.errorMessage =
            error?.error?.message ??
            'Unable to save report.';

          this.cdr.detectChanges();
        }

      });
  }


  /* =========================================================
     BACK
  ========================================================= */

  backToPrograms(): void {

    this.router.navigate([
      '/representative/reports/programs'
    ]);
  }


  /* =========================================================
     TRACK FUNCTIONS
  ========================================================= */

  trackProgram(
    index: number,
    program: Program
  ): number {

    return program.program_id;
  }


  trackSection(
    index: number,
    section: ProgramSection
  ): number {

    return section.program_id;
  }


  trackParticular(
    index: number,
    particular: Particular
  ): number {

    return particular.particular_id;
  }


  trackQuarter(
    index: number,
    quarter: ReportQuarter
  ): number {

    return quarter.quarter_id;
  }
}