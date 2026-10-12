import { Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'link' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center whitespace-nowrap rounded-full border font-medium ' +
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
};

@Component({
  selector: 'button[app-button], a[app-button]',
  template: `
    @if (loading()) {
      <span class="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"></span>
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