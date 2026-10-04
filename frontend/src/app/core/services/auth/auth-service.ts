import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { Message } from "../../models/message.model";

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);

    getSample() {
        return this.http.get<Message>('http://127.0.0.1:8000/api/sample');
    }
}
