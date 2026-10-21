import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ChurchService } from '../../../../core/services/church/church-service';
import { Church } from '../../../../core/models/church.model';
import { RunningLoader } from '../../../../shared/components/running-loader/running-loader';

@Component({
  selector: 'app-reports-details',
  standalone: true,
  imports: [CommonModule, RunningLoader],
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
  loadingChurches = false;

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
    this.loadingChurches = true;
    this.errorMessage = '';

    this.churchService.getChurches(this.districtId).subscribe({

      next: (response) => {
        this.loadingChurches = false;

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
        this.loadingChurches = false;

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
      [`${this.portalPrefix()}/reports/programs`],
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
      [`${this.portalPrefix()}/reports`]
    );

  }

  openChurch(church: Church): void {

    console.log(
      '[REPORT DETAILS] Opening church:',
      church
    );

    this.router.navigate(
      [
        `${this.portalPrefix()}/reports/programs`,
        this.districtId,
        church.church_id
      ]
    );

  }

  private portalPrefix(): '/director' | '/assistant' {
    return this.router.url.startsWith('/assistant')
      ? '/assistant'
      : '/director';
  }

  getMonitoring(churchId: number) {
    const monitoring = this.churches.find(
      church => church.church_id === churchId
    )?.monitoring;

    return {
      q1: { progress: monitoring?.q1 ?? null, approved: !!monitoring?.q1_approved },
      q2: { progress: monitoring?.q2 ?? null, approved: !!monitoring?.q2_approved },
      q3: { progress: monitoring?.q3 ?? null, approved: !!monitoring?.q3_approved },
      q4: { progress: monitoring?.q4 ?? null, approved: !!monitoring?.q4_approved }
    };
  }

}