import { TestBed } from '@angular/core/testing';

import { UserContextService } from './user-context.service';

describe('UserContextService', () => {
  let service: UserContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Also the check that the test-environment localStorage shim is a real Storage, not a stub.
  it('persists and clears the acting user in localStorage', () => {
    service.setUser(7);
    expect(service.userId()).toBe(7);
    expect(localStorage.getItem('tch_current_user_id')).toBe('7');

    service.clearUser();
    expect(service.userId()).toBeNull();
    expect(localStorage.getItem('tch_current_user_id')).toBeNull();
  });
});
