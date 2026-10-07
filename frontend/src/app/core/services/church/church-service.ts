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

export interface DistrictResponse {
  success: boolean;
  data: Church[];
}

export interface ChurchesResponse {
  success: boolean;
  district: Church;
  data: Church[];
}

@Injectable({
  providedIn: 'root'
})
export class ChurchService {

  private readonly apiUrl =
    'http://127.0.0.1:8000/api';

  constructor(
    private readonly http: HttpClient
  ) {}

  getDistricts(): Observable<DistrictResponse> {

    return this.http.get<DistrictResponse>(
      `${this.apiUrl}/districts`
    );
  }

  getChurches(
    districtId: number
  ): Observable<ChurchesResponse> {

    return this.http.get<ChurchesResponse>(
      `${this.apiUrl}/districts/${districtId}/churches`
    );
  }
}