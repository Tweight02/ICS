import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Editbap } from './editbap';

describe('Editbap', () => {
  let component: Editbap;
  let fixture: ComponentFixture<Editbap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Editbap],
    }).compileComponents();

    fixture = TestBed.createComponent(Editbap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
