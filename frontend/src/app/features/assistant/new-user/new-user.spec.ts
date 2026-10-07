import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewUser } from './new-user';

describe('NewUser', () => {
  let component: NewUser;
  let fixture: ComponentFixture<NewUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewUser],
    }).compileComponents();

    fixture = TestBed.createComponent(NewUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
