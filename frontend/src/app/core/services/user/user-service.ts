import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Service } from '@angular/core';
import { User } from '../../models/user.model';
import { Church } from '../../models/church.model';
import { Department } from '../../models/department.model';

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
}
