import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ChallengeListComponent } from './challenge-list.component';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

describe('ChallengeListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    // Establish a signed-in user (id 1) before any component is created.
    TestBed.inject(AuthService).signIn('alex.kim', 'ChangeMe123!').subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/auth/signin`)
      .flush({ id: 1, username: 'alex.kim', role: 'Admin' });
  });

  const listUrl = `${environment.apiBaseUrl}/challenges`;

  it('should create', () => {
    const fixture = TestBed.createComponent(ChallengeListComponent);
    TestBed.tick();

    expect(fixture.componentInstance).toBeTruthy();

    httpMock.expectOne((r) => r.url === listUrl).flush([]);
    httpMock.verify();
  });

  it('shows the spinner state until the first response arrives', async () => {
    const fixture = TestBed.createComponent(ChallengeListComponent);
    const component = fixture.componentInstance;

    expect(component.loading()).toBe(true);
    expect(component.challenges()).toEqual([]);

    TestBed.tick();
    httpMock.expectOne((r) => r.url === listUrl).flush([
      {
        id: 1,
        title: 'Improve deploy pipeline',
        rawNotes: 'Deploys take too long.',
        problemStatement: null,
        status: 'Submitted',
        submittedByUserId: 1,
        createdAt: '2026-07-29T00:00:00Z',
        updatedAt: '2026-07-29T00:00:00Z',
        options: [],
      },
    ]);
    await Promise.resolve();
    TestBed.tick();

    expect(component.loading()).toBe(false);
    expect(component.challenges().length).toBe(1);
    httpMock.verify();
  });

  it('scopes the fetch to the current user', () => {
    TestBed.createComponent(ChallengeListComponent);
    TestBed.tick();

    const req = httpMock.expectOne((r) => r.url === listUrl);
    expect(req.request.params.get('userId')).toBe('1');

    req.flush([]);
    httpMock.verify();
  });

  it('re-fetches with the status filter when it changes', async () => {
    const fixture = TestBed.createComponent(ChallengeListComponent);
    TestBed.tick();
    httpMock.expectOne((r) => r.url === listUrl).flush([]);
    await Promise.resolve();
    TestBed.tick();

    fixture.componentInstance.onFilterChange('Approved');
    TestBed.tick();

    const req = httpMock.expectOne((r) => r.url === listUrl);
    expect(req.request.params.get('status')).toBe('Approved');
    expect(req.request.params.get('userId')).toBe('1');

    req.flush([]);
    httpMock.verify();
  });
});
