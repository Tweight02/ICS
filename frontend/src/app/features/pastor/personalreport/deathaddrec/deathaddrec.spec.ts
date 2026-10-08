import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Deathaddrec } from './deathaddrec';

describe('Deathaddrec', () => {
  let component: Deathaddrec;
  let fixture: ComponentFixture<Deathaddrec>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Deathaddrec],
    }).compileComponents();

    fixture = TestBed.createComponent(Deathaddrec);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
