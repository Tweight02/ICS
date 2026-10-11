import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Pastor } from "../../models/pastor.model";
import { Representative, RepresentativeFilters } from "../../models/representative.model";

export interface PaginatedRepresentatives {
    data: Representative[];
    current_page: number;
    last_page: number;
    total: number;
}
// representative.service.ts
@Injectable({ providedIn: 'root' })
export class RepresentativeService {

    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:8000/api/pastor';
    private opts = { withCredentials: true };

    deleteRepresentative(user_id: number) {
        return this.http.delete<{ message: string }>(
            `${this.apiUrl}/representatives/${user_id}`,
            this.opts
        );
    }

    getRepresentatives(filters: RepresentativeFilters = {}) {
        let params = new HttpParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params = params.set(key, String(value));
            }
        });

        return this.http.get<PaginatedRepresentatives>(
            `${this.apiUrl}/representatives`,
            { params, withCredentials: true }
        );
    }

    getChurches(search = '') {
        const params = search ? new HttpParams().set('search', search) : new HttpParams();
        return this.http.get<{ data: ChurchWithRep[] }>(
            `${this.apiUrl}/representatives`, { params, ...this.opts });
    }

    getAvailableChurches() {
        return this.http.get<{ data: { church_id: number; name: string }[] }>(
            `${this.apiUrl}/representatives/churches`,
            { withCredentials: true }
        );
    }

    create(data: any) {
        return this.http.post(
            `${this.apiUrl}/representatives`,
            data,
            { withCredentials: true }
        );
    }

    update(id: number, data: any) {
        return this.http.put(`${this.apiUrl}/representatives/${id}`, data, this.opts);
    }

    getById(id: number) {
        return this.http.get<{ data: Representative }>(
            `${this.apiUrl}/representatives/${id}`,
            this.opts
        );
    }
}

export interface ChurchWithRep {
    church_id: number;
    name: string;
    representative: Pastor | null;   // reuse your Pastor/User model
}
