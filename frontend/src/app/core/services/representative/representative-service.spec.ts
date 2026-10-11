import { TestBed } from '@angular/core/testing';
import { RepresentativeService } from './representative-service';

describe('RepresentativeService', () => {
  let service: RepresentativeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RepresentativeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
