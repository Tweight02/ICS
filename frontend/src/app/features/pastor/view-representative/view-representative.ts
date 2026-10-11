import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { RepresentativeService, ChurchWithRep } from '../../../core/services/representative/representative-service';
import { UserService } from '../../../core/services/user/user-service'; // adjust path
import { Department } from '../../../core/models/department.model';

@Component({
  selector: 'app-view-representative',
  imports: [ReactiveFormsModule],
  styleUrl: './view-representative.css',
  templateUrl: './view-representative.html',
})
export class ViewRepresentative implements OnInit {
  private svc = inject(RepresentativeService);
  private userSvc = inject(UserService);
  private fb = inject(FormBuilder);

  churches = signal<ChurchWithRep[]>([]);
  departments = signal<Department[]>([]);
  search = signal('');

  // dialog state
  dialogOpen = signal(false);
  editingId = signal<number | null>(null);
  churchName = signal('');
  saving = signal(false);
  errors = signal<string[]>([]);

  form = this.fb.nonNullable.group({
    church_id: [0, Validators.required],
    department_id: [0, Validators.required],
    first_name: ['', Validators.required],
    middle_name: [''],
    last_name: ['', Validators.required],
    extension_name: [''],
    birthdate: ['', Validators.required],
    gender: ['male', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
  });

  ngOnInit() {
    this.load();
    this.userSvc.getDepartments().subscribe(r => this.departments.set(r.data));
  }

  load() {
    this.svc.getChurches(this.search()).subscribe(r => this.churches.set(r.data));
  }

  onSearch(value: string) {
    this.search.set(value);
    this.load();
  }

  // Vacant church -> blank form
  add(church: ChurchWithRep) {
    this.editingId.set(null);
    this.churchName.set(church.name);
    this.errors.set([]);
    this.form.reset({
      church_id: church.church_id,
      department_id: 0,
      first_name: '', middle_name: '', last_name: '', extension_name: '',
      birthdate: '', gender: 'male', email: '', password: '',
    });
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    this.dialogOpen.set(true);
  }

  // Filled church -> prefilled form
  edit(church: ChurchWithRep) {
    const r: any = church.representative;
    this.editingId.set(r.user_id);
    this.churchName.set(church.name);
    this.errors.set([]);
    this.form.reset({
      church_id: church.church_id,
      department_id: r.department_id,
      first_name: r.first_name,
      middle_name: r.middle_name ?? '',
      last_name: r.last_name,
      extension_name: r.extension_name ?? '',
      birthdate: (r.birthdate ?? '').slice(0, 10),
      gender: r.gender,
      email: r.email,
      password: '',
    });
    // password optional when editing
    this.form.controls.password.setValidators([Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    this.dialogOpen.set(true);
  }

  close() {
    this.dialogOpen.set(false);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errors.set([]);

    const payload = this.form.getRawValue();
    const id = this.editingId();

    const request = id
      ? this.svc.update(id, payload)
      : this.svc.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const e = err.error?.errors;
        this.errors.set(
          e ? Object.values<string[]>(e).flat() : [err.error?.message ?? 'Something went wrong.']
        );
      },
    });
  }
}