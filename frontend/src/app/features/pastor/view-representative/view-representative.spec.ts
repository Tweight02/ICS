import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewRepresentative } from './view-representative';

describe('ViewRepresentative', () => {
  let component: ViewRepresentative;
  let fixture: ComponentFixture<ViewRepresentative>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewRepresentative],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewRepresentative);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
