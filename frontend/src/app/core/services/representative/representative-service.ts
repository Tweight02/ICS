import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Pastor } from "../../models/pastor.model";
import { Representative, RepresentativeFilters } from "../../models/representative.model";

export interface PaginatedRepresentatives {
    data: Representative[];
    current_page: number;
    last_page: number;
    total: number;
    from?: number | null;
    to?: number | null;
}

export interface ChurchWithRep {
    church_id: number;
    name: string;
    representative: Pastor | null;
}

// representative.service.ts
@Injectable({ providedIn: 'root' })
export class RepresentativeService {

    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:8000/api/pastor';
    private opts = { withCredentials: true };

    getRepresentatives(filters: RepresentativeFilters = {}) {
        let params = new HttpParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params = params.set(key, String(value));
            }
        });

        return this.http.get<PaginatedRepresentatives>(
            `${this.apiUrl}/representatives`,
            { params, ...this.opts }
        );
    }

    getChurches(search = '') {
        const params = search ? new HttpParams().set('search', search) : new HttpParams();
        return this.http.get<{ data: ChurchWithRep[] }>(
            `${this.apiUrl}/representatives`,
            { params, ...this.opts }
        );
    }

    getAvailableChurches() {
        return this.http.get<{ data: { church_id: number; name: string }[] }>(
            `${this.apiUrl}/representatives/churches`,
            this.opts
        );
    }

    getTransferChurches() {
        return this.http.get<{ data: { church_id: number; name: string }[] }>(
            `${this.apiUrl}/representatives/transfer-churches`,
            this.opts
        );
    }

    getById(id: number) {
        return this.http.get<{ data: Representative }>(
            `${this.apiUrl}/representatives/${id}`,
            this.opts
        );
    }

    create(data: any) {
        return this.http.post(`${this.apiUrl}/representatives`, data, this.opts);
    }

    update(id: number, data: any) {
        return this.http.put(`${this.apiUrl}/representatives/${id}`, data, this.opts);
    }

    transferRepresentatives(transfers: { user_id: number; church_id: number }[]) {
        return this.http.post<{ message: string; transferred_count: number }>(
            `${this.apiUrl}/representatives/bulk-transfer`,
            { transfers },
            this.opts
        );
    }

    activateRepresentative(id: number) {
        return this.http.post<{ message: string }>(
            `${this.apiUrl}/representatives/${id}/activate`,
            {},
            this.opts
        );
    }

    deleteRepresentative(id: number) {
        return this.http.delete<{ message: string }>(
            `${this.apiUrl}/representatives/${id}`,
            this.opts
        );
    }
}