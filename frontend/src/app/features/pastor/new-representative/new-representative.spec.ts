import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewRepresentative } from './new-representative';

describe('NewRepresentative', () => {
  let component: NewRepresentative;
  let fixture: ComponentFixture<NewRepresentative>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewRepresentative],
    }).compileComponents();

    fixture = TestBed.createComponent(NewRepresentative);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
