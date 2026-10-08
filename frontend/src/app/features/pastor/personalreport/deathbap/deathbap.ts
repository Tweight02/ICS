import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-deathbap',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './deathbap.html',
  styleUrls: ['./deathbap.css']
})
export class DeathbapComponent {

  selectedRecord: 'baptism' | 'death' = 'baptism';

  selectRecord(record: 'baptism' | 'death'): void {
    this.selectedRecord = record;
  }

}