import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChurchRole } from './church-role';

describe('ChurchRole', () => {
  let component: ChurchRole;
  let fixture: ComponentFixture<ChurchRole>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChurchRole],
    }).compileComponents();

    fixture = TestBed.createComponent(ChurchRole);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
