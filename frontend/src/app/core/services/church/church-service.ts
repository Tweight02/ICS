import {
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  Church
} from '../../models/church.model';
import { Department } from '../../models/department.model';
import {
  BaptismSummaryRecord,
  DeathSummaryRecord,
  MissionReportSummary,
  ReportSummaryDrilldown
} from '../../models/report.model';

export interface DistrictResponse {
  success: boolean;
  data: Church[];
}

export interface MyDistrictChurchesResponse {
  success: boolean;
  district: Church;
  data: Church[];
}

export interface ChurchesResponse {
  success: boolean;
  district: Church;
  data: Church[];
}

export interface ChurchDirectoryResponse {
  success: boolean;
  data: Church[];
}

@Injectable({
  providedIn: 'root'
})
export class ChurchService {
  getMyDistrict(): Observable<{
  success: boolean;
  district: Church;
}> {
  return this.http.get<{
    success: boolean;
    district: Church;
  }>(`${this.apiUrl}/pastor/my-district`);
}

getMyDistrictChurches(year?: number): Observable<MyDistrictChurchesResponse> {
  return this.http.get<MyDistrictChurchesResponse>(
    `${this.apiUrl}/pastor/my-district/churches`,
    { params: year ? { year } : {} }
  );
}

  private readonly apiUrl =
    '/api';

  constructor(
    private readonly http: HttpClient
  ) {}

  getDistricts(departmentId?: number, year?: number): Observable<DistrictResponse> {
    return this.http.get<DistrictResponse>(`${this.apiUrl}/districts`, {
      params: {
        ...(departmentId ? { department_id: departmentId } : {}),
        ...(year ? { year } : {})
      }
    });
  }

  getDepartments(): Observable<{ success: boolean; data: Department[] }> {
    return this.http.get<{ success: boolean; data: Department[] }>(
      `${this.apiUrl}/departments`
    );
  }

  getMissionReportSummary(year: number, departmentId?: number): Observable<{
    success: boolean;
    data: MissionReportSummary;
  }> {
    return this.http.get<{
      success: boolean;
      data: MissionReportSummary;
    }>(`${this.apiUrl}/reports/mission-summary`, {
      params: {
        year,
        ...(departmentId ? { department_id: departmentId } : {})
      }
    });
  }

  getReportSummaryDrilldown(params: {
    year: number;
    department_id: number;
    program_id: number;
    particular_id?: number;
    quarter: string;
    district_id?: number;
    church_id?: number;
  }): Observable<{ success: boolean; data: ReportSummaryDrilldown }> {
    return this.http.get<{ success: boolean; data: ReportSummaryDrilldown }>(
      `${this.apiUrl}/reports/mission-summary/drilldown`,
      { params: { ...params } }
    );
  }

  getBaptismRecordsForQuarter(year: number, quarter: string): Observable<{
    success: boolean;
    data: BaptismSummaryRecord[];
  }> {
    return this.http.get<{
      success: boolean;
      data: BaptismSummaryRecord[];
    }>(`${this.apiUrl}/reports/mission-summary/baptisms`, {
      params: { year, quarter }
    });
  }

  getDeathRecordsForQuarter(year: number, quarter: string): Observable<{
    success: boolean;
    data: DeathSummaryRecord[];
  }> {
    return this.http.get<{
      success: boolean;
      data: DeathSummaryRecord[];
    }>(`${this.apiUrl}/reports/mission-summary/deaths`, {
      params: { year, quarter }
    });
  }

  getAllChurches(): Observable<ChurchDirectoryResponse> {
    return this.http.get<ChurchDirectoryResponse>(
      `${this.apiUrl}/churches`
    );
  }

  getChurches(
    districtId: number,
    departmentId?: number,
    year?: number,
    includeDepartmentMonitoring = false
  ): Observable<ChurchesResponse> {

    return this.http.get<ChurchesResponse>(
      `${this.apiUrl}/districts/${districtId}/churches`,
      {
        params: {
          ...(departmentId ? { department_id: departmentId } : {}),
          ...(year ? { year } : {}),
          ...(includeDepartmentMonitoring
            ? { include_department_monitoring: '1' }
            : {})
        }
      }
    );
  }
}