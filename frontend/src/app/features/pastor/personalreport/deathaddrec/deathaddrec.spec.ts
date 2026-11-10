import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ChurchService } from '../../../../core/services/church/church-service';
import { DeathaddrecComponent } from './deathaddrec';

describe('DeathaddrecComponent', () => {
  let component: DeathaddrecComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: {} },
        { provide: ChurchService, useValue: {} },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: () => null }
            }
          }
        },
        { provide: Router, useValue: { navigate: vi.fn() } }
      ]
    });

    component = TestBed.runInInjectionContext(() => new DeathaddrecComponent());
  });

  it('updates the quarter from a date selected outside the initially selected quarter', () => {
    component.deathDateYear = new Date().getFullYear();
    component.death.quarter = 'Q1';
    component.death.date_of_death = `${component.deathDateYear}-06-15`;

    component.validateDeathDate();

    expect(component.death.quarter).toBe('Q2');
    expect(component.death.date_of_death).toBe(`${component.deathDateYear}-06-15`);
    expect(component.getMinimumDeathDateForQuarter()).toBe(`${component.deathDateYear}-01-01`);
    expect(component.getMaximumDeathDate()).toBe(component.today);
  });
});
