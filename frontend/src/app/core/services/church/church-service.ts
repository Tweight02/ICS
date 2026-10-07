import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ChurchesResponse, DistrictResponse } from '../../models/church.model';


@Injectable({
  providedIn: 'root'
})
export class ChurchService {

  private http = inject(HttpClient);

  private readonly apiUrl = 'http://127.0.0.1:8000/api';

  getDistricts(): Observable<DistrictResponse> {
    return this.http.get<DistrictResponse>(
      `${this.apiUrl}/districts`
    );
  }

  getChurches(districtId: number): Observable<ChurchesResponse> {
    return this.http.get<ChurchesResponse>(
      `${this.apiUrl}/districts/${districtId}/churches`
    );
  }
}