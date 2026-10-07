import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ChurchService } from '../../../core/services/church/church-service';
import { Church } from '../../../core/models/church.model';

@Component({
  selector: 'app-reports-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-details.html',
  styleUrl: './reports-details.css'
})
export class ReportsDetails implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private churchService = inject(ChurchService);

  districtId = 0;
  districtName = '';

  district: Church | null = null;
  churches: Church[] = [];

  errorMessage = '';

  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage = 'District ID was not provided.';
      return;
    }

    this.districtId = Number(id);

    this.loadChurches();
  }

  loadChurches(): void {

    this.churchService.getChurches(this.districtId).subscribe({

      next: (response) => {

        this.district = response.district;

        this.districtName =
          response.district?.name || '';

        this.churches =
          Array.isArray(response.data)
            ? response.data
            : [];

        console.log(
          '[REPORT DETAILS] District:',
          this.district
        );

        console.log(
          '[REPORT DETAILS] Churches:',
          this.churches
        );

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          '[REPORT DETAILS] API error:',
          error
        );

        this.district = null;
        this.churches = [];

        this.errorMessage =
          'Unable to load district details.';

        this.cdr.detectChanges();
      }

    });

  }

  openDepartmentReports(): void {

    this.router.navigate(
      ['/pastor/reports/programs'],
      {
        queryParams: {
          district_id: this.districtId,
          district_name: this.districtName
        }
      }
    );

  }

  backToDistricts(): void {

    this.router.navigate(
      ['/pastor/reports']
    );

  }

  openChurch(church: Church): void {

    console.log(
      '[REPORT DETAILS] Opening church:',
      church
    );

    this.router.navigate(
      ['/pastor/reports/programs'],
      {
        queryParams: {
          district_id: this.districtId,
          district_name: this.districtName,
          church_id: church.church_id,
          church_name: church.name
        }
      }
    );

  }

  getMonitoring(index: number) {

    const monitoring = [
      { q1: true, q2: true, q3: 50, q4: false },
      { q1: true, q2: true, q3: 60, q4: false },
      { q1: true, q2: true, q3: 45, q4: false },
      { q1: true, q2: true, q3: 55, q4: false },
      { q1: true, q2: true, q3: 40, q4: false }
    ];

    return monitoring[index % monitoring.length];
  }

}