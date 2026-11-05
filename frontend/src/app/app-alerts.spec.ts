import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App alert dismissal', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hides inline alerts after three seconds', async () => {
    await TestBed.configureTestingModule({
      imports: [App]
    }).compileComponents();

    vi.useFakeTimers();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const alert = document.createElement('div');
    alert.setAttribute('role', 'alert');
    alert.textContent = 'Save failed.';
    document.body.appendChild(alert);

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(3000);

    expect(alert.hidden).toBe(true);

    alert.remove();
    fixture.destroy();
  });
});
