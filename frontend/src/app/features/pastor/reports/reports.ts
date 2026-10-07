import {
  Component,
  OnInit,
  NgZone,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  Router
} from '@angular/router';

import {
  finalize
} from 'rxjs/operators';

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

  private readonly churchService =
    inject(ChurchService);

  private readonly router =
    inject(Router);

  private readonly zone =
    inject(NgZone);


  /* =========================================
     DATA
  ========================================= */

  districts: Church[] = [];

  churches: Church[] = [];

  selectedDistrict: Church | null = null;


  /* =========================================
     STATE
  ========================================= */

  loadingDistricts = false;

  loadingChurches = false;

  errorMessage = '';


  /* =========================================
     INIT
  ========================================= */

  ngOnInit(): void {

    this.loadDistricts();

  }


  /* =========================================
     LOAD DISTRICTS
  ========================================= */

  loadDistricts(): void {

    this.loadingDistricts = true;

    this.errorMessage = '';

    console.log(
      '[REPORTS] Loading districts...'
    );


    this.churchService
      .getDistricts()

      .pipe(

        finalize(() => {

          this.zone.run(() => {

            this.loadingDistricts = false;

            console.log(
              '[REPORTS] District loading finished'
            );

          });

        })

      )

      .subscribe({

        next: (response) => {

          console.log(
            '[REPORTS] District API response:',
            response
          );


          this.zone.run(() => {

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

              this.errorMessage = '';

              return;
            }


            this.districts = [];

            this.errorMessage =
              'Unable to load districts.';

          });

        },


        error: (error) => {

          console.error(
            '[REPORTS] District API error:',
            error
          );


          this.zone.run(() => {

            this.districts = [];

            this.errorMessage =
              'Unable to connect to the district server.';

          });

        }

      });

  }


  /* =========================================
     SELECT DISTRICT
  ========================================= */

  selectDistrict(
    district: Church
  ): void {

    console.log(
      '[REPORTS] Selected district:',
      district
    );


    this.selectedDistrict =
      district;

    this.loadChurches(
      district.church_id
    );

  }


  /* =========================================
     LOAD CHURCHES
  ========================================= */

  loadChurches(
    districtId: number
  ): void {

    this.loadingChurches = true;

    this.errorMessage = '';

    this.churches = [];


    console.log(
      '[REPORTS] Loading churches for:',
      districtId
    );


    this.churchService

      .getChurches(districtId)

      .pipe(

        finalize(() => {

          this.zone.run(() => {

            this.loadingChurches = false;

            console.log(
              '[REPORTS] Church loading finished:',
              this.churches.length
            );

          });

        })

      )

      .subscribe({

        next: (response) => {

          console.log(
            '[REPORTS] Church API response:',
            response
          );


          this.zone.run(() => {

            if (
              response &&
              response.success &&
              Array.isArray(response.data)
            ) {

              this.churches =
                [...response.data];


              if (response.district) {

                this.selectedDistrict =
                  response.district;

              }


              this.errorMessage = '';

              console.log(
                '[REPORTS] Churches loaded:',
                this.churches.length
              );

              return;
            }


            this.churches = [];

            this.errorMessage =
              'No churches found for this district.';

          });

        },


        error: (error) => {

          console.error(
            '[REPORTS] Church API error:',
            error
          );


          this.zone.run(() => {

            this.churches = [];

            this.errorMessage =
              'Unable to load churches.';

          });

        }

      });

  }


  /* =========================================
     BACK
  ========================================= */

  backToDistricts(): void {

    this.zone.run(() => {

      this.selectedDistrict = null;

      this.churches = [];

      this.errorMessage = '';

    });

  }


  /* =========================================
     OPEN CHURCH REPORT
  ========================================= */

  openChurch(
    church: Church
  ): void {

    console.log(
      '[REPORTS] Opening church:',
      church
    );


    this.router.navigate(
      ['/pastor/reports-details'],
      {
        queryParams: {
          church_id:
            church.church_id,

          parent_id:
            church.parent_id
        }
      }
    );

  }


  /* =========================================
     COUNTERS
  ========================================= */

  get districtCount(): number {

    return this.districts.length;

  }


  get churchCount(): number {

    return this.churches.length;

  }

}