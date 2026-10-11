import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ReportService } from './report';

describe('ReportService', () => {
  let service: ReportService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ReportService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('counts departments without report data as incomplete when aggregating approvals', () => {
    let monitoring: { q1: number | null } | undefined;

    service.getChurchMonitoring(1).subscribe(result => {
      monitoring = result;
    });

    httpTestingController
      .expectOne('http://127.0.0.1:8000/api/churches/1/departments')
      .flush([
        { department_id: 1, department_name: 'Department with report' },
        { department_id: 2, department_name: 'Department without report' }
      ]);

    httpTestingController
      .expectOne('http://127.0.0.1:8000/api/churches/1/departments/1/report')
      .flush({
        programs: [{
          sections: [{
            particulars: [{
              quarters: [{
                quarter: 'Q1',
                year: 2026,
                mission_approve: '2026-10-12',
                value: 1
              }]
            }]
          }]
        }]
      });

    httpTestingController
      .expectOne('http://127.0.0.1:8000/api/churches/1/departments/2/report')
      .flush({ programs: [] });

    expect(monitoring?.q1).toBe(50);
  });

  it('keeps quarter monitoring empty when no department has report data', () => {
    let monitoring: { q1: number | null } | undefined;

    service.getChurchMonitoring(1).subscribe(result => {
      monitoring = result;
    });

    httpTestingController
      .expectOne('http://127.0.0.1:8000/api/churches/1/departments')
      .flush([
        { department_id: 2, department_name: 'Department without report' }
      ]);

    httpTestingController
      .expectOne('http://127.0.0.1:8000/api/churches/1/departments/2/report')
      .flush({ programs: [] });

    expect(monitoring?.q1).toBeNull();
  });
});
