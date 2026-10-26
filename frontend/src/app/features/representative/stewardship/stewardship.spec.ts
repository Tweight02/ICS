import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { StewardshipService } from '../../../core/services/stewardship/stewardship.service';
import { Stewardship } from './stewardship';

describe('Stewardship', () => {
  let component: Stewardship;
  let fixture: ComponentFixture<Stewardship>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Stewardship],
      providers: [
        {
          provide: StewardshipService,
          useValue: {
            getReport: () => of({
              church: { church_id: 1, name: 'Test Church', district: 'Test District' },
              year: new Date().getFullYear(),
              particulars: [],
              report: {
                status: 'Draft',
                dateSubmitted: null,
                values: {},
                monthly: {},
              },
            }),
            saveReport: () => of({ message: 'Report saved.', status: 'Draft' }),
            submitReport: () => of({ message: 'Report submitted.', status: 'Submitted' }),
            reopenReport: () => of({ message: 'Report reopened.', status: 'Draft' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Stewardship);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
