import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewUser } from './view-user';

describe('ViewUser', () => {
  let component: ViewUser;
  let fixture: ComponentFixture<ViewUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewUser],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
