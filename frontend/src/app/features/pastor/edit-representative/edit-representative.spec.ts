import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditRepresentative } from './edit-representative';

describe('EditRepresentative', () => {
  let component: EditRepresentative;
  let fixture: ComponentFixture<EditRepresentative>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditRepresentative],
    }).compileComponents();

    fixture = TestBed.createComponent(EditRepresentative);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
