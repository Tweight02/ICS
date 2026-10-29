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

getMyDistrictChurches(): Observable<MyDistrictChurchesResponse> {
  return this.http.get<MyDistrictChurchesResponse>(
    `${this.apiUrl}/pastor/my-district/churches`
  );
}

  private readonly apiUrl =
    '/api';

  constructor(
    private readonly http: HttpClient
  ) {}

  getDistricts(departmentId?: number): Observable<DistrictResponse> {
    return this.http.get<DistrictResponse>(`${this.apiUrl}/districts`, {
      params: departmentId ? { department_id: departmentId } : {}
    });
  }

  getDepartments(): Observable<{ success: boolean; data: Department[] }> {
    return this.http.get<{ success: boolean; data: Department[] }>(
      `${this.apiUrl}/departments`
    );
  }

  getAllChurches(): Observable<ChurchDirectoryResponse> {
    return this.http.get<ChurchDirectoryResponse>(
      `${this.apiUrl}/churches`
    );
  }

  getChurches(
    districtId: number,
    departmentId?: number
  ): Observable<ChurchesResponse> {

    return this.http.get<ChurchesResponse>(
      `${this.apiUrl}/districts/${districtId}/churches`,
      { params: departmentId ? { department_id: departmentId } : {} }
    );
  }
}