import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChallengeDetailComponent } from './challenge-detail.component';
import { environment } from '../../../environments/environment';
import { Challenge } from '../../core/models/challenge.model';

describe('ChallengeDetailComponent', () => {
  let fixture: ComponentFixture<ChallengeDetailComponent>;
  let component: ChallengeDetailComponent;
  let httpMock: HttpTestingController;

  const fakeChallenge: Challenge = {
    id: 1,
    title: 'Improve deploy pipeline',
    rawNotes: 'Deploys take too long.',
    problemStatement: null,
    status: 'Submitted',
    submittedByUserId: 1,
    createdAt: '2026-07-29T00:00:00Z',
    updatedAt: '2026-07-29T00:00:00Z',
    options: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChallengeDetailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ngOnInit already fired the request; each test decides how it resolves.
  function expectLoadRequest() {
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/challenges/1`);
    expect(req.request.method).toBe('GET');
    return req;
  }

  it('should create', () => {
    expectLoadRequest().flush(fakeChallenge);
    expect(component).toBeTruthy();
  });

  it('loads the challenge by route id and stores it in the signal', () => {
    expectLoadRequest().flush(fakeChallenge);

    expect(component.challenge()).toEqual(fakeChallenge);
    expect(component.loadFailed()).toBe(false);
  });

  it('sets loadFailed instead of spinning forever when the challenge is missing', () => {
    expectLoadRequest().flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(component.challenge()).toBeNull();
    expect(component.loadFailed()).toBe(true);
  });
});
