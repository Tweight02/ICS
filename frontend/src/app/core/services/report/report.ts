
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { from, of } from 'rxjs';
import { map, mergeMap, switchMap, toArray } from 'rxjs/operators';

import {
  Department,
  DepartmentReport,
  DistrictReportMonitoring,
  ReportMonitoring,
  ReportQuarter,
  ReportComment,
  SaveReportItem,
  ChurchesResponse
} from '../../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://127.0.0.1:8000/api';
  private readonly monitoringConcurrency = 3;

  private readonly emptyMonitoring: ReportMonitoring = {
    q1: null,
    q2: null,
    q3: null,
    q4: null
  };

  getDepartments(churchId: number): Observable<Department[]> {
    return this.http.get<Department[]>(
      `${this.apiUrl}/churches/${churchId}/departments`
    );
  }

  getChurchMonitoring(churchId: number): Observable<ReportMonitoring> {
    return this.getDepartments(churchId).pipe(
      map(response => {
        if (!Array.isArray(response)) {
          throw new Error('Unexpected departments response.');
        }

        return response;
      }),
      switchMap(departments => {
        if (departments.length === 0) {
          return of(this.emptyMonitoring);
        }

        return from(departments).pipe(
          mergeMap(
            department =>
              this.getDepartmentReport(churchId, department.department_id).pipe(
                map(report => this.buildMonitoring(report))
              ),
            this.monitoringConcurrency
          ),
          toArray(),
          map(monitoring => this.averageMonitoring(monitoring))
        );
      })
    );
  }

  getDistrictMonitoring(
    districtId: number
  ): Observable<DistrictReportMonitoring> {
    return this.http
      .get<ChurchesResponse>(`${this.apiUrl}/districts/${districtId}/churches`)
      .pipe(
        switchMap(response => {
          if (!Array.isArray(response.data)) {
            throw new Error('Unexpected district churches response.');
          }

          const churches = response.data;

          if (churches.length === 0) {
            return of({
              churchCount: 0,
              monitoring: this.emptyMonitoring
            });
          }

          return from(churches).pipe(
            mergeMap(
              church => this.getChurchMonitoring(church.church_id),
              this.monitoringConcurrency
            ),
            toArray(),
            map(monitoring => ({
              churchCount: churches.length,
              monitoring: this.averageMonitoring(monitoring)
            }))
          );
        })
      );
  }

  getDepartmentReport(
    churchId: number,
    departmentId: number
  ): Observable<DepartmentReport> {
    return this.http.get<DepartmentReport>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/report`
    );
  }

  saveDepartmentReport(
    churchId: number,
    departmentId: number,
    items: SaveReportItem[]
  ): Observable<{ message: string; saved_count?: number }> {
    return this.http.post<{ message: string; saved_count?: number }>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/report/save`,
      { items }
    );
  }

  endorseDepartmentReport(
    churchId: number,
    departmentId: number,
    year: number | string,
    quarter: string
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/report/endorse`,
      { year, quarter }
    );
  }

  approveDepartmentReport(
    churchId: number,
    departmentId: number,
    year: number | string,
    quarter: string
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/report/approve`,
      { year, quarter }
    );
  }

  getDepartmentComments(
    churchId: number,
    departmentId: number
  ): Observable<{ data: ReportComment[] } | ReportComment[]> {
    return this.http.get<{ data: ReportComment[] } | ReportComment[]>(
      `${this.apiUrl}/churches/${churchId}/departments/${departmentId}/comments`
    );
  }

  getComments(quarterId: number) {
    return this.http.get<{ data: ReportComment[] } | ReportComment[]>(
      `${this.apiUrl}/quarters/${quarterId}/comments`
    );
  }

  addComment(
    quarterId: number,
    churchId: number,
    departmentId: number,
    details: string
  ) {
    return this.http.post<{ message: string; data: ReportComment }>(
      `${this.apiUrl}/comments`,
      {
        quarter_id: quarterId,
        church_id: churchId,
        department_id: departmentId,
        details: details.trim()
      }
    );
  }

  private buildMonitoring(report: DepartmentReport): ReportMonitoring {
    const records = (report.programs ?? []).flatMap(program =>
      (program.sections ?? []).flatMap(section =>
        (section.particulars ?? []).flatMap(particular =>
          particular.quarters ?? []
        )
      )
    );

    if (records.length === 0) {
      return this.emptyMonitoring;
    }

    const years = records
      .map(record => Number(record.year))
      .filter(year => Number.isFinite(year) && year > 0);

    if (years.length === 0) {
      return this.emptyMonitoring;
    }

    const latestYear = Math.max(...years);
    const latestRecords = records.filter(
      record => Number(record.year) === latestYear
    );

    return {
      q1: this.getQuarterProgress(latestRecords, 1),
      q2: this.getQuarterProgress(latestRecords, 2),
      q3: this.getQuarterProgress(latestRecords, 3),
      q4: this.getQuarterProgress(latestRecords, 4)
    };
  }

  private getQuarterProgress(
    records: ReportQuarter[],
    quarterNumber: number
  ): number | null {
    const quarterRecords = records.filter(
      record => this.getQuarterNumber(record.quarter) === quarterNumber
    );

    if (quarterRecords.length === 0) {
      return null;
    }

    if (quarterRecords.every(record => this.hasValue(record.mission_approve))) {
      return 100;
    }

    const completed = quarterRecords.filter(
      record => record.value !== null && record.value !== undefined
    ).length;

    return completed === 0
      ? null
      : Math.min(99, Math.round((completed / quarterRecords.length) * 100));
  }

  private averageMonitoring(
    values: ReportMonitoring[]
  ): ReportMonitoring {
    const averageForQuarter = (quarter: keyof ReportMonitoring): number | null => {
      const available = values
        .map(monitoring => monitoring[quarter])
        .filter((value): value is number => value !== null);

      return available.length === 0
        ? null
        : Math.round(
            available.reduce((sum, value) => sum + value, 0) / values.length
          );
    };

    return {
      q1: averageForQuarter('q1'),
      q2: averageForQuarter('q2'),
      q3: averageForQuarter('q3'),
      q4: averageForQuarter('q4')
    };
  }

  private getQuarterNumber(quarter: string): number {
    const match = String(quarter).toUpperCase().match(/(?:Q|QUARTER\s*)?([1-4])/);
    return match ? Number(match[1]) : 0;
  }

  private hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }
}
