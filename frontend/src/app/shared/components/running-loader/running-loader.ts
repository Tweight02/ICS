import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-running-loader',
  standalone: true,
  templateUrl: './running-loader.html',
})
export class RunningLoader {
  @Input() size: 'small' | 'medium' = 'medium';
}