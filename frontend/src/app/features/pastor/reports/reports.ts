import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChurchService } from '../../../core/services/church/church-service';
import { Church } from '../../../core/models/church.model';

type Quarter = 'q1' | 'q2' | 'q3' | 'q4';

type QuarterStatus = Record<Quarter, boolean>;

const EMPTY_STATUS: QuarterStatus = {
  q1: false,
  q2: false,
  q3: false,
  q4: false
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class Reports implements OnInit {

  private churchService = inject(ChurchService);

  readonly quarters: Quarter[] = ['q1', 'q2', 'q3', 'q4'];

  districts: Church[] = [];
  churches: Church[] = [];
  selectedDistrict: Church | null = null;

  searchText = '';

  loadingDistricts = false;
  loadingChurches = false;

  districtError = '';
  churchError = '';

  // church_id -> quarters with a submitted report
  private statusMap: Record<number, QuarterStatus> = {};

  ngOnInit(): void {
    // Load cached districts first so the page
    // can immediately display existing data.
    this.loadCachedDistricts();

    // Refresh districts from the API in the background.
    this.loadDistricts();
  }

  // ============================================================
  // DERIVED LISTS
  // ============================================================

  get filteredDistricts(): Church[] {
    return this.filterBySearch(this.districts);
  }

  get filteredChurches(): Church[] {
    return this.filterBySearch(this.churches);
  }

  private filterBySearch(list: Church[]): Church[] {
    const search = this.searchText.trim().toLowerCase();

    if (!search) {
      return list;
    }

    return list.filter(c =>
      (c.name ?? '').toLowerCase().includes(search) ||
      (c.address ?? '').toLowerCase().includes(search)
    );
  }

  // ============================================================
  // TEMPLATE HELPERS
  // ============================================================

  getStatus(churchId: number): QuarterStatus {
    return this.statusMap[churchId] ?? EMPTY_STATUS;
  }

  /**
   * Call this once your reports endpoint returns data.
   *
   * Example:
   *
   * this.setStatuses(response.data);
   *
   * Each row should look like:
   * {
   *   church_id: 1,
   *   q1: true,
   *   q2: false,
   *   q3: true,
   *   q4: false
   * }
   */
  setStatuses(
    rows: Array<{ church_id: number } & Partial<QuarterStatus>>
  ): void {

    const map: Record<number, QuarterStatus> = {};

    for (const row of rows) {
      map[row.church_id] = {
        q1: !!row.q1,
        q2: !!row.q2,
        q3: !!row.q3,
        q4: !!row.q4
      };
    }

    this.statusMap = map;
  }

  trackByChurchId(index: number, item: Church): number {
    return item.church_id;
  }

  // ============================================================
  // DISTRICTS
  // ============================================================

  private loadCachedDistricts(): void {
    try {
      const cached = localStorage.getItem('ics_districts');

      if (!cached) {
        return;
      }

      const districts: Church[] = JSON.parse(cached);

      if (Array.isArray(districts) && districts.length > 0) {
        this.districts = districts;
      }

    } catch (error) {
      console.warn(
        'Unable to read district cache:',
        error
      );
    }
  }

  loadDistricts(): void {
    this.districtError = '';

    this.churchService.getDistricts().subscribe({
      next: (response) => {
        if (response?.success && Array.isArray(response.data)) {
          this.districts = response.data;
          console.log(this.districts)
          try {
            localStorage.setItem(
              'ics_districts',
              JSON.stringify(response.data)
            );
          } catch {
            // Storage unavailable/full
          }
        } else if (this.districts.length === 0) {
          this.districtError =
            'No district data was returned by the server.';
        }
      },

      error: (error: any) => {
        console.error('Failed to load districts:', error);

        if (this.districts.length === 0) {
          this.districtError =
            'Unable to connect to the district server.';
        }
      }
    });
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {

    if (this.selectedDistrict) {

      this.selectDistrict(
        this.selectedDistrict
      );

    } else {

      this.loadDistricts();
    }
  }

  // ============================================================
  // CHURCHES
  // ============================================================

  selectDistrict(district: Church): void {
    this.selectedDistrict = district;
    this.searchText = '';
    this.churchError = '';

    const cacheKey = `ics_churches_${district.church_id}`;

    // Load cached churches immediately
    try {
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const cachedChurches: Church[] = JSON.parse(cached);

        this.churches = Array.isArray(cachedChurches)
          ? cachedChurches
          : [];
      } else {
        this.churches = [];
      }

    } catch (error) {
      console.warn('Unable to read church cache:', error);
      this.churches = [];
    }

    // Get latest data in background
    this.churchService.getChurches(district.church_id).subscribe({
      next: (response) => {

        if (response?.success && Array.isArray(response.data)) {
          this.churches = response.data;

          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify(response.data)
            );
          } catch {
            // Storage unavailable/full
          }

        } else if (this.churches.length === 0) {
          this.churchError =
            'No church data was returned by the server.';
        }
      },

      error: (error: any) => {
        console.error('Failed to load churches:', error);

        // Keep cached data if available
        if (this.churches.length === 0) {
          this.churchError =
            'Unable to load churches for this district.';
        }
      }
    });
  }

  // ============================================================
  // BACK TO DISTRICTS
  // ============================================================

  backToDistricts(): void {
    this.selectedDistrict = null;
    this.churches = [];
    this.searchText = '';
    this.churchError = '';
  }

}