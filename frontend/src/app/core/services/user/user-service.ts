import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Service } from '@angular/core';
import { User } from '../../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:8000/api';
    

}
