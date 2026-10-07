import {
  Component,
  OnInit,
  NgZone,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  Router
} from '@angular/router';

import {
  ChurchService
} from '../../../core/services/church/church-service';

import {
  Church
} from '../../../core/models/church.model';


@Component({
  selector: 'app-reports',
  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports implements OnInit {

  /*
   * ==========================================
   * SERVICES
   * ==========================================
   */

  private readonly churchService =
    inject(ChurchService);

  private readonly router =
    inject(Router);

  private readonly zone =
    inject(NgZone);

  private readonly cdr =
    inject(ChangeDetectorRef);


  /*
   * ==========================================
   * DATA
   * ==========================================
   */

  districts: Church[] = [];


  /*
   * ==========================================
   * STATE
   * ==========================================
   */

  loadingDistricts = false;

  errorMessage = '';


  /*
   * ==========================================
   * INITIALIZATION
   * ==========================================
   */

  ngOnInit(): void {

    this.loadDistricts();

  }


  /*
   * ==========================================
   * LOAD DISTRICTS
   * ==========================================
   */

  loadDistricts(): void {

    this.loadingDistricts = true;

    this.errorMessage = '';

    console.log(
      '[REPORTS] Loading districts...'
    );


    /*
     * Make Angular update the loading state
     * immediately.
     */

    this.cdr.detectChanges();


    this.churchService
      .getDistricts()
      .subscribe({

        /*
         * ======================================
         * SUCCESS
         * ======================================
         */

        next: (response) => {

          console.log(
            '[REPORTS] District API response:',
            response
          );


          this.zone.run(() => {

            /*
             * Check API response
             */

            if (
              response &&
              response.success &&
              Array.isArray(response.data)
            ) {

              this.districts =
                [...response.data];


              console.log(
                '[REPORTS] Districts loaded:',
                this.districts.length
              );

            }

            else {

              this.districts = [];

              this.errorMessage =
                'Unable to load districts.';

            }


            /*
             * Stop loading
             */

            this.loadingDistricts = false;


            console.log(
              '[REPORTS] District loading finished'
            );


            /*
             * IMPORTANT:
             *
             * Force Angular to refresh the
             * template after NgZone updates.
             */

            this.cdr.detectChanges();

          });

        },


        /*
         * ======================================
         * ERROR
         * ======================================
         */

        error: (error) => {

          console.error(
            '[REPORTS] District API error:',
            error
          );


          this.zone.run(() => {

            this.districts = [];

            this.loadingDistricts = false;

            this.errorMessage =
              'Unable to connect to the district server.';


            /*
             * Force UI update
             */

            this.cdr.detectChanges();

          });

        }

      });

  }


  /*
   * ==========================================
   * MONITORING PERCENTAGE
   * ==========================================
   *
   * Temporary value.
   *
   * Replace this later with the actual
   * quarterly report monitoring data.
   */

  getMonitoringPercentage(
    _district: Church
  ): number {

    return 50;

  }


  /*
   * ==========================================
   * OPEN DISTRICT
   * ==========================================
   */

  openDistrict(
    district: Church
  ): void {

    console.log(
      '[REPORTS] Opening district:',
      district
    );


    this.router.navigate(
      ['/pastor/reports/details'],   // was '/pastor/reports-details'
      {
        queryParams: {
          district_id: district.church_id,
          district_name: district.name
        }
      }
    );

  }


  /*
   * ==========================================
   * DISTRICT COUNT
   * ==========================================
   */

  get districtCount(): number {

    return this.districts.length;

  }

}