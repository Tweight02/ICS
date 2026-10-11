import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Pastor } from "../../models/pastor.model";

// representative.service.ts
@Injectable({ providedIn: 'root' })
export class RepresentativeService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:8000/api/pastor';
    private opts = { withCredentials: true };

    getChurches(search = '') {
        const params = search ? new HttpParams().set('search', search) : new HttpParams();
        return this.http.get<{ data: ChurchWithRep[] }>(
            `${this.apiUrl}/representatives`, { params, ...this.opts });
    }

    create(data: any) {
        return this.http.post(`${this.apiUrl}/representatives`, data, this.opts);
    }

    update(id: number, data: any) {
        return this.http.put(`${this.apiUrl}/representatives/${id}`, data, this.opts);
    }
}

export interface ChurchWithRep {
    church_id: number;
    name: string;
    representative: Pastor | null;   // reuse your Pastor/User model
}
