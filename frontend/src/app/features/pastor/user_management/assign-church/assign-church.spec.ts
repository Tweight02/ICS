import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssignChurch } from './assign-church';

describe('AssignChurch', () => {
  let component: AssignChurch;
  let fixture: ComponentFixture<AssignChurch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignChurch],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignChurch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
