import { TestBed } from '@angular/core/testing';

import { CourseAPIService } from './course-api.service';

describe('CourseAPIService', () => {
  let service: CourseAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CourseAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
