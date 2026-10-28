import { Component, computed, input } from '@angular/core';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'danger-outline'
  | 'link'
  | 'ghost'
  | 'back'
  | 'create'
  | 'submit'
  | 'endorse'
  | 'approve'
  | 'edit'
  | 'event-edit'
  | 'delete'
  | 'view-participants'
  | 'done';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center whitespace-nowrap !rounded-full border font-medium ' +
  'transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ' +
  'disabled:cursor-not-allowed disabled:opacity-55';

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 gap-1 px-3 text-xs',
  md: 'h-8 gap-1.5 px-4 text-xs',
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    '!no-underline !border-transparent !bg-[#0F4A30] !text-white shadow-sm hover:!bg-[#0c3d27] focus-visible:ring-[#0F4A30]',
  secondary:
    '!no-underline border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-[#0F4A30]',
  danger:
    '!no-underline border-transparent bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  'danger-outline':
    '!no-underline border-red-200 bg-white text-red-600 hover:bg-red-50 focus-visible:ring-red-500',
  link:
    'border-transparent bg-transparent text-red-700 underline hover:text-red-800 focus-visible:ring-red-500',
  ghost:
    '!no-underline border-transparent bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-[#0F4A30]',
  back:
    '!no-underline !border-transparent !bg-gradient-to-b !from-emerald-400 !to-emerald-600 !text-white shadow-[0_6px_12px_-5px_rgba(6,78,59,0.4)] hover:!-translate-y-0.5 hover:!from-emerald-500 hover:!to-emerald-700 focus-visible:ring-emerald-500/50',
  create:
    '!no-underline border-transparent bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 focus-visible:ring-emerald-600',
  submit:
    '!no-underline border-transparent bg-blue-700 text-white shadow-sm hover:bg-blue-800 focus-visible:ring-blue-600',
  endorse:
    '!no-underline border-transparent bg-sky-700 text-white shadow-sm hover:bg-sky-800 focus-visible:ring-sky-600',
  approve:
    '!no-underline border-transparent bg-green-700 text-white shadow-sm hover:bg-green-800 focus-visible:ring-green-600',
  edit:
    '!no-underline border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 focus-visible:ring-amber-500',
  'event-edit':
    '!no-underline border-emerald-200 bg-white text-emerald-900 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 focus-visible:ring-emerald-600',
  delete:
    '!no-underline border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500',
  'view-participants':
    '!no-underline border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 focus-visible:ring-emerald-600',
  done:
    '!no-underline border-transparent bg-slate-700 text-white shadow-sm hover:bg-slate-800 focus-visible:ring-slate-500',
};

@Component({
  selector: 'button[app-button], a[app-button]',
  template: `
    @if (loading()) {
      <span
        class="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
        aria-hidden="true"
      ></span>
    }
    <ng-content />
  `,
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() || null',
  },
})
export class Button {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  loading = input(false);

  classes = computed(() => `${BASE} ${SIZES[this.size()]} ${VARIANTS[this.variant()]}`);
}
