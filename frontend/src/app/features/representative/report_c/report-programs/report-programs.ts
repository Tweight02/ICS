import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  Router
} from '@angular/router';

import {
  ReportService
} from '../../../../core/services/report/report';

import {
  Department,
  Church,
  ChurchesResponse
} from '../../../../core/models/report.model';


@Component({
  selector: 'app-report-programs',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './report-programs.html',

  styleUrls: [
    './report-programs.css'
  ]
})
export class ReportPrograms implements OnInit {

  /* =========================================================
     SERVICES
  ========================================================= */

  private readonly reportService =
    inject(ReportService);

  private readonly router =
    inject(Router);

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
     DISTRICT
  ========================================================= */

  readonly districtId = 210;

  readonly districtName =
    'Eastern Nueva Vizcaya';


  /* =========================================================
     CHURCH
  ========================================================= */

  churchId =
    this.CURRENT_USER.church_id;

  churchName =
    'Church';

  churchAddress =
    '';


  /* =========================================================
     DEPARTMENTS
  ========================================================= */

  departments: Department[] = [];


  /* =========================================================
     UI STATE
  ========================================================= */

  loading = false;

  errorMessage = '';


  /* =========================================================
     INITIALIZE
  ========================================================= */

  ngOnInit(): void {

    this.loadChurch();

    this.loadDepartments();

  }


  /* =========================================================
     LOAD CHURCH
  ========================================================= */

  private loadChurch(): void {

    /*
    |--------------------------------------------------------------------------
    | If your district endpoint is already working,
    | use it to get the representative's church.
    |--------------------------------------------------------------------------
    */

    fetch(
      `http://127.0.0.1:8000/api/districts/${this.districtId}/churches`
    )

      .then(
        response => {

          if (!response.ok) {

            throw new Error(
              'Unable to load churches.'
            );
          }

          return response.json();
        }
      )

      .then(
        (response: ChurchesResponse) => {

          const churches =
            response.data || [];

          const currentChurch =
            churches.find(
              church =>
                Number(church.church_id) ===
                Number(this.churchId)
            );


          if (currentChurch) {

            this.churchName =
              currentChurch.name;

            this.churchAddress =
              currentChurch.address || '';

          }


          this.cdr.detectChanges();

        }
      )

      .catch(
        () => {

          /*
          |--------------------------------------------------------------------------
          | Keep default church name if the
          | church request fails.
          |--------------------------------------------------------------------------
          */

          this.churchName =
            'Church Representative';

          this.cdr.detectChanges();

        }
      );
  }


  /* =========================================================
     LOAD DEPARTMENTS
  ========================================================= */

  private loadDepartments(): void {

    this.loading = true;

    this.errorMessage = '';


    this.reportService
      .getDepartments(this.churchId)

      .subscribe({

        next: (
          departments: Department[]
        ) => {

          /*
          |--------------------------------------------------------------------------
          | REMOVE REPORTS NOT HANDLED BY REPRESENTATIVE
          |--------------------------------------------------------------------------
          */

          this.departments =
            departments.filter(
              department =>
                this.isRepresentativeReport(
                  department
                )
            );


          this.loading = false;

          this.cdr.detectChanges();

        },


        error: (
          error
        ) => {

          console.error(
            'Unable to load departments:',
            error
          );


          this.departments = [];

          this.errorMessage =
            error?.error?.message ||
            'Unable to load reports.';


          this.loading = false;

          this.cdr.detectChanges();

        }

      });
  }


  /* =========================================================
     REPRESENTATIVE REPORT FILTER
  ========================================================= */

  isRepresentativeReport(
    department: Department
  ): boolean {

    const name =
      String(
        department.department_name || ''
      )
        .trim()
        .toLowerCase();


    /*
    |--------------------------------------------------------------------------
    | REPORTS NOT HANDLED BY REPRESENTATIVE
    |--------------------------------------------------------------------------
    */

    const excludedReports = [

      'baptism record',

      'death record',

      'baptism',

      'death'

    ];


    /*
    |--------------------------------------------------------------------------
    | EXCLUDE BAPTISM / DEATH
    |--------------------------------------------------------------------------
    */

    return !excludedReports.some(
      excluded => {

        return (
          name === excluded ||
          name.includes(excluded)
        );

      }
    );
  }


  /* =========================================================
     OPEN DEPARTMENT
  ========================================================= */

  openDepartment(
    department: Department
  ): void {

    if (
      !department ||
      !department.department_id
    ) {

      return;
    }


    this.router.navigate([
      '/representative/reports/particulars',
      department.department_id
    ]);

  }


  /* =========================================================
     BACK
  ========================================================= */

  backToReports(): void {

    this.router.navigate([
      '/representative/reports'
    ]);

  }


  /* =========================================================
     TRACK DEPARTMENT
  ========================================================= */

  trackDepartment(
    index: number,
    department: Department
  ): number {

    return department.department_id;

  }


  /* =========================================================
     DEPARTMENT ICON
  ========================================================= */

  getDepartmentIcon(
    departmentName: string
  ): string {

    const name =
      String(
        departmentName || ''
      ).toLowerCase();


    if (
      name.includes('mission')
    ) {

      return '✦';

    }


    if (
      name.includes('education')
    ) {

      return '▣';

    }


    if (
      name.includes('youth')
    ) {

      return '♟';

    }


    if (
      name.includes('children')
    ) {

      return '♧';

    }


    if (
      name.includes('health')
    ) {

      return '✚';

    }


    if (
      name.includes('family')
    ) {

      return '⌂';

    }


    if (
      name.includes('communication')
    ) {

      return '◉';

    }


    if (
      name.includes('sabbath')
    ) {

      return '◷';

    }


    return '▤';

  }


  /* =========================================================
     REPRESENTATIVE DEPARTMENTS
  ========================================================= */

  get representativeDepartments():
    Department[] {

    return this.departments.filter(
      department =>
        this.isRepresentativeReport(
          department
        )
    );

  }

}