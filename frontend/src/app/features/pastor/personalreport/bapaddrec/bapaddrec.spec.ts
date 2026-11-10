import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ChurchService } from '../../../../core/services/church/church-service';
import { BapaddrecComponent } from './bapaddrec';

describe('BapaddrecComponent', () => {
  let component: BapaddrecComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: {} },
        { provide: ChurchService, useValue: {} },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } }
        },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    });

    component = TestBed.runInInjectionContext(() => new BapaddrecComponent());
  });

  it('updates the quarter from a date selected outside the initially selected quarter', () => {
    component.baptismDateYear = new Date().getFullYear();
    component.baptism.quarter = 'Q1';
    component.baptism.date_of_baptism = `${component.baptismDateYear}-06-15`;

    component.validateBaptismDate();
    component.updateBaptismDateRange();

    expect(component.baptism.quarter).toBe('Q2');
    expect(component.baptism.date_of_baptism).toBe(`${component.baptismDateYear}-06-15`);
    expect(component.baptismDateMin).toBe(`${component.baptismDateYear}-01-01`);
    expect(component.baptismDateMax).toBe(component.today);
  });
});
