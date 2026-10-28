import { Component, OnInit, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth/auth-service';

@Component({
  imports: [],
  selector: 'app-home',

  templateUrl: './home.html',
})
export class Home{

  private sample = inject(AuthService);

  data = toSignal(
    this.sample.getSample()
  );
}
