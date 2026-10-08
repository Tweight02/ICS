import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditUser } from './edit-user';

describe('EditUser', () => {
  let component: EditUser;
  let fixture: ComponentFixture<EditUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditUser],
    }).compileComponents();

    fixture = TestBed.createComponent(EditUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
