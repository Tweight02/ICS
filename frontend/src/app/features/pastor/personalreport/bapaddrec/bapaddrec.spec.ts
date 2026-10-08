import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Bapaddrec } from './bapaddrec';

describe('Bapaddrec', () => {
  let component: Bapaddrec;
  let fixture: ComponentFixture<Bapaddrec>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bapaddrec],
    }).compileComponents();

    fixture = TestBed.createComponent(Bapaddrec);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
