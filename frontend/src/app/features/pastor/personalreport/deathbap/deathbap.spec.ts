import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Deathbap } from './deathbap';

describe('Deathbap', () => {
  let component: Deathbap;
  let fixture: ComponentFixture<Deathbap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Deathbap],
    }).compileComponents();

    fixture = TestBed.createComponent(Deathbap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
