import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Department } from '../../models/report.model';
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

  it('loads departments and approval flags with one request', () => {
    let departments: Department[] | undefined;

    service.getDepartments(1).subscribe(result => {
      departments = result;
    });

    httpTestingController
      .expectOne('/api/churches/1/departments')
      .flush([
        {
          department_id: 1,
          department_name: 'Department with report',
          q1_approved: true,
          q2_approved: false,
          q3_approved: false,
          q4_approved: false
        }
      ]);

    expect(departments?.[0].q1_approved).toBe(true);
    expect(departments?.[0].q2_approved).toBe(false);
  });

  it('requests department monitoring for the selected year', () => {
    service.getDepartments(1, 2025).subscribe();

    httpTestingController
      .expectOne('/api/churches/1/departments?year=2025')
      .flush([]);
  });
});
