import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, Service } from '@angular/core';
import { User } from '../../models/user.model';
import { Church } from '../../models/church.model';
import { Department } from '../../models/department.model';
import { Paginated, Pastor, PastorFilters } from '../../models/pastor.model';

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
        }>(`${this.apiUrl}/assistant/districts`);
    }

    getDepartments(){
        return this.http.get<{message: string, data: Department[]}>(`${this.apiUrl}/assistant/departments`, 
            // {
            // withCredentials: true,
            // }
        );
    }

    getPastors(filters: PastorFilters = {}) {
        let params = new HttpParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params = params.set(key, String(value));
            }
        });

        return this.http.get<Paginated<Pastor>>(
            `${this.apiUrl}/pastors`,
            { params, withCredentials: true }
        );
    }
}
