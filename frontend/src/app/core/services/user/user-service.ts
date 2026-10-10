import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { User } from '../../models/user.model';
import { Church } from '../../models/church.model';
import { Department } from '../../models/department.model';
import {
    Paginated,
    Pastor,
    PastorFilters
} from '../../models/pastor.model';

@Injectable({
    providedIn: 'root'
})
export class UserService {

    private http = inject(HttpClient);

    private apiUrl = 'http://localhost:8000/api';

    createUser(data: any) {

        return this.http.post(
            `${this.apiUrl}/assistant/users`,
            data,
            {
                withCredentials: true
            }
        );
    }

    getDistricts() {

        return this.http.get<{
            success: boolean;
            data: Church[];
        }>(
            `${this.apiUrl}/assistant/districts`,
            {
                withCredentials: true
            }
        );
    }

    getDepartments() {

        return this.http.get<{
            message: string;
            data: Department[];
        }>(
            `${this.apiUrl}/assistant/departments`,
            {
                withCredentials: true
            }
        );
    }

    getPastors(filters: PastorFilters = {}) {

        let params = new HttpParams();

        Object.entries(filters).forEach(([key, value]) => {

            if (
                value !== undefined &&
                value !== null &&
                value !== ''
            ) {

                params = params.set(
                    key,
                    String(value)
                );

            }

        });

        return this.http.get<Paginated<Pastor>>(
            `${this.apiUrl}/assistant/pastors`,
            {
                params,
                withCredentials: true
            }
        );
    }

    getPastor(id: number | string) {

        return this.http.get<{
            data: Pastor;
        }>(
            `${this.apiUrl}/assistant/pastors/${id}`,
            {
                withCredentials: true
            }
        );
    }

    updatePastor(
        id: number | string,
        data: any
    ) {

        return this.http.put<{
            message: string;
            user: Pastor;
        }>(
            `${this.apiUrl}/assistant/pastors/${id}`,
            data,
            {
                withCredentials: true
            }
        );
    }

    /**
     * Bulk transfer pastors to different districts.
     */
    bulkTransfer(
        transfers: {
            user_id: number;
            church_id: number;
        }[]
    ) {
        return this.http.post<{
            message: string;
            transferred_count: number;
        }>(
            `${this.apiUrl}/assistant/pastors/bulk-transfer`,
            { transfers },
            { withCredentials: true }
        );
    }

    checkDistrictPastor(churchId: number | string) {
        return this.http.get<{
            data: {
                has_pastor: boolean;
                pastor_name: string | null;
            };
        }>(
            `${this.apiUrl}/assistant/districts/${churchId}/pastor`,
            { withCredentials: true }
        );
    }
}