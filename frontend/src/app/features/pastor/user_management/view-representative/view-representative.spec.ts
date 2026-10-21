import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RepresentativeService } from '../../../../core/services/representative/representative-service';
import { ChurchService } from '../../../../core/services/church/church-service';
import { ViewRepresentative } from './view-representative';

describe('ViewRepresentative', () => {
  let component: ViewRepresentative;
  let fixture: ComponentFixture<ViewRepresentative>;
  const representativeService = {
    getRepresentatives: vi.fn().mockReturnValue(of({
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
      from: null,
      to: null,
    })),
  };
  const churchService = {
    getMyDistrictChurches: vi.fn().mockReturnValue(of({ data: [] })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewRepresentative],
      providers: [
        provideRouter([]),
        { provide: RepresentativeService, useValue: representativeService },
        { provide: ChurchService, useValue: churchService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewRepresentative);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads representatives with church, status, search, and pagination filters', () => {
    component.search.set('Amina');
    component.status.set('active');
    component.churchId.set(42);
    component.currentPage.set(2);

    component.loadRepresentatives();

    expect(representativeService.getRepresentatives).toHaveBeenLastCalledWith({
      search: 'Amina',
      status: 'active',
      church_id: 42,
      page: 2,
      per_page: 10,
    });
  });
});
