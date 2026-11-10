import { ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ChurchService } from '../../../../core/services/church/church-service';
import { EditbapComponent } from './editbap';

describe('EditbapComponent', () => {
  let component: EditbapComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: {} },
        { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn() } },
        { provide: ChurchService, useValue: {} },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => null },
              queryParamMap: { get: () => null }
            }
          }
        },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    });

    component = TestBed.runInInjectionContext(() => new EditbapComponent());
  });

  it('updates the quarter from a date selected outside the initially selected quarter', () => {
    component.baptismQuarterYear = new Date().getFullYear();
    component.baptism.quarter = 'Q1';
    component.baptism.date_of_baptism = `${component.baptismQuarterYear}-06-15`;

    component.onBaptismDateChange();

    expect(component.baptism.quarter).toBe('Q2');
    expect(component.baptism.date_of_baptism).toBe(`${component.baptismQuarterYear}-06-15`);
    expect(component.reportYearStartDate).toBe(`${component.baptismQuarterYear}-01-01`);
    expect(component.reportYearEndDate).toBe(`${component.baptismQuarterYear}-12-31`);
  });
});
