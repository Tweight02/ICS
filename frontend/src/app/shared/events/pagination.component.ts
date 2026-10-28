import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-between">
      <p class="text-xs text-gray-500">Showing {{ from }}–{{ to }} of {{ total }} {{ label }}</p>
      <div class="flex items-center gap-1">
        <button type="button" (click)="go(page - 1)" [disabled]="page <= 1" aria-label="Previous page"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent">
          <i class="bi bi-chevron-left"></i>
        </button>
        <button *ngFor="let p of visiblePages" type="button" (click)="go(p)"
                class="w-8 h-8 rounded-lg text-sm font-bold"
                [ngClass]="p === page ? 'bg-[#1b4d3e] text-white' : 'text-gray-600 hover:bg-gray-100'">{{ p }}</button>
        <button type="button" (click)="go(page + 1)" [disabled]="page >= pages" aria-label="Next page"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  `,
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() pageSize = 5;
  @Input() total = 0;
  @Input() label = 'items';
  @Output() pageChange = new EventEmitter<number>();

  get pages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get from(): number {
    return this.total ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get to(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  /** At most 5 page numbers around the current page. */
  get visiblePages(): number[] {
    const start = Math.max(1, Math.min(this.page - 2, this.pages - 4));
    const end = Math.min(this.pages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  go(p: number): void {
    const next = Math.min(Math.max(1, p), this.pages);
    if (next !== this.page) this.pageChange.emit(next);
  }
}
