import { Component, Signal, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ChallengeApiService } from './challenge-api.service';
import { Challenge, ChallengeStatus } from '../models/challenge.model';
import { environment } from '../../../environments/environment';

// httpResource must be created in an injection context, so the factory is
// exercised through a host component the way the real caller uses it.
@Component({ standalone: true, template: '' })
class HostComponent {
  private readonly api = inject(ChallengeApiService);

  readonly status = signal<ChallengeStatus | null>(null);
  readonly userId = signal<number | null>(1);

  private readonly resource = this.api.challengesResource(() => ({
    status: this.status(),
    userId: this.userId(),
  }));

  readonly challenges: Signal<Challenge[]> = this.resource.value;
  readonly loading: Signal<boolean> = this.resource.isLoading;
}

describe('ChallengeApiService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(TestBed.inject(ChallengeApiService)).toBeTruthy();
  });

  it('sends userId as a query param and omits status when it is null', () => {
    const fixture = TestBed.createComponent(HostComponent);
    TestBed.tick();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/challenges`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('userId')).toBe('1');
    expect(req.request.params.has('status')).toBe(false);

    req.flush([]);
    httpMock.verify();
  });

  it('sends both params when a status filter is set', () => {
    const fixture = TestBed.createComponent(HostComponent);
    TestBed.tick();
    httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/challenges`).flush([]);

    fixture.componentInstance.status.set('Submitted');
    TestBed.tick();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/challenges`);
    expect(req.request.params.get('status')).toBe('Submitted');
    expect(req.request.params.get('userId')).toBe('1');

    req.flush([]);
    httpMock.verify();
  });

  it('omits userId when there is no current user', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.userId.set(null);
    TestBed.tick();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/challenges`);
    expect(req.request.params.has('userId')).toBe(false);

    req.flush([]);
    httpMock.verify();
  });
});
