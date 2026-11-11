import { DIRECTOR_ROUTES } from './director.routes';

describe('DIRECTOR_ROUTES', () => {
  it('registers event detail and participant routes under the director event list', () => {
    const eventsRoute = DIRECTOR_ROUTES.find(route => route.path === 'events');

    expect(eventsRoute?.children?.map(route => route.path)).toEqual([
      '',
      ':id',
      ':id/participants',
    ]);
  });
});
