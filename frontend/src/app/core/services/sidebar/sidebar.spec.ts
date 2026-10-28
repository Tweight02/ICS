import { TestBed } from '@angular/core/testing';
import { SidebarService } from './sidebar';

describe('Sidebar', () => {
  let service: SidebarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SidebarService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts the pastor menu with Representatives and omits Personal Report', () => {
    const menu = service.getMenu('pastor');

    expect(menu[0]).toMatchObject({
      label: 'Representatives',
      route: '/pastor/view-representatives'
    });
    expect(menu.some(item => item.label === 'Personal Report')).toBe(false);
  });
});
