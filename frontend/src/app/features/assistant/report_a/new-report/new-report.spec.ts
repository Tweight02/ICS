import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NewReport } from './new-report';

describe('NewReport', () => {
  let component: NewReport;
  let fixture: ComponentFixture<NewReport>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewReport],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NewReport);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpTesting.expectOne('http://localhost:8000/api/assistant/departments').flush({
      success: true,
      data: []
    });
  });

  afterEach(() => httpTesting.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with one blank particular item', () => {
    expect(component.particularItems.length).toBe(1);
  });

  it('keeps at least one particular item in the template', () => {
    component.removeParticularItem(0);

    expect(component.particularItems.length).toBe(1);
  });
});
