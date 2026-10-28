import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Button, ButtonVariant } from './button';

describe('Button', () => {
  let component: Button;
  let fixture: ComponentFixture<Button>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Button],
    }).compileComponents();

    fixture = TestBed.createComponent(Button);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps every shared action button fully rounded', () => {
    expect(component.classes()).toContain('!rounded-full');
  });

  it('provides a reusable compact back-button style', () => {
    fixture.componentRef.setInput('variant', 'back');
    fixture.componentRef.setInput('size', 'md');
    fixture.detectChanges();

    expect(component.classes()).toContain('!from-emerald-400');
    expect(component.classes()).toContain('!to-emerald-600');
    expect(component.classes()).toContain('h-8');
  });

  it.each([
    ['create', 'bg-emerald-700'],
    ['submit', 'bg-blue-700'],
    ['endorse', 'bg-sky-700'],
    ['approve', 'bg-green-700'],
    ['edit', 'bg-amber-50'],
    ['event-edit', 'border-emerald-200'],
    ['delete', 'bg-red-600'],
    ['view-participants', 'text-emerald-800'],
    ['done', 'bg-slate-700'],
  ] as const satisfies readonly (readonly [ButtonVariant, string])[])(
    'provides a %s action style',
    (variant, expectedClass) => {
      fixture.componentRef.setInput('variant', variant);
      fixture.detectChanges();

      expect(component.classes()).toContain(expectedClass);
    },
  );
});
