import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NewReport } from './new-report';
import { AuthService } from '../../../../core/services/auth/auth-service';

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
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => ({ department_id: 17 })
          }
        }
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NewReport);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpTesting.expectOne('/api/assistant/departments').flush({
      success: true,
      data: [
        { department_id: 16, department_name: 'Ministerial & Evangelism' },
        { department_id: 17, department_name: 'Youth Ministries' }
      ]
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

  it('displays only the signed-in user department as read-only', () => {
    fixture.detectChanges();

    expect(component.departments).toEqual([
      { department_id: 17, department_name: 'Youth Ministries' }
    ]);
    expect(component.assignedDepartment?.department_name).toBe('Youth Ministries');
    expect(component.form.controls.department_id.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('select#report-department')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Youth Ministries');
    expect(fixture.nativeElement.textContent).not.toContain('Ministerial & Evangelism');
  });
});
