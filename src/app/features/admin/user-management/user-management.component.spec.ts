import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';

import { UserManagementComponent } from './user-management.component';
import { environment } from '../../../../environments/environment';

describe('UserManagementComponent', () => {
  let httpMock: HttpTestingController;

  const usersUrl = `${environment.apiBaseUrl}/users`;
  const seeded = [
    { id: 1, name: 'Alex Kim', username: 'alex.kim', role: 'Admin' as const },
    { id: 2, name: 'Jordan Patel', username: 'jordan.patel', role: 'Collaborator' as const },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserManagementComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  const create = () => {
    const fixture = TestBed.createComponent(UserManagementComponent);
    httpMock.expectOne(usersUrl).flush(seeded);
    fixture.detectChanges();
    return fixture;
  };

  it('lists the users returned by the API', () => {
    const fixture = create();

    expect(fixture.componentInstance.users().length).toBe(2);
    httpMock.verify();
  });

  it('changing a role puts the new role and reloads', () => {
    const fixture = create();

    fixture.componentInstance.onRoleChange(seeded[1], 'Admin');

    const put = httpMock.expectOne(`${usersUrl}/2/role`);
    expect(put.request.body).toEqual({ role: 'Admin' });
    put.flush({ ...seeded[1], role: 'Admin' });

    httpMock.expectOne(usersUrl).flush(seeded);
    httpMock.verify();
  });

  it('deleting a user reloads the list', () => {
    const fixture = create();

    fixture.componentInstance.onDelete(seeded[1]);

    httpMock
      .expectOne(`${usersUrl}/2`)
      .flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne(usersUrl).flush([seeded[0]]);

    expect(fixture.componentInstance.users().length).toBe(1);
    httpMock.verify();
  });

  it('explains the block when deleting a user who owns challenges', () => {
    const fixture = create();
    const snackBar = TestBed.inject(MatSnackBar);
    const open = vi.spyOn(snackBar, 'open');

    fixture.componentInstance.onDelete(seeded[1]);

    httpMock.expectOne(`${usersUrl}/2`).flush(
      { error: 'That user still owns challenges. Remove those first.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(open).toHaveBeenCalled();
    expect(open.mock.calls[0][0]).toContain('challenges');
    httpMock.verify();
  });
});
