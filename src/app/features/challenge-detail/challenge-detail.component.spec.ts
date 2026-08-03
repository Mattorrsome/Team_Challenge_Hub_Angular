import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ChallengeDetailComponent } from './challenge-detail.component';
import { environment } from '../../../environments/environment';
import { Challenge, ChallengeStatus } from '../../core/models/challenge.model';

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

  const panelCases: Array<[ChallengeStatus, 'problem-statement' | 'solution-options' | 'none']> = [
    ['Submitted', 'problem-statement'],
    ['ProblemStatementDrafted', 'problem-statement'],
    ['OptionsDrafted', 'solution-options'],
    ['OptionSelected', 'solution-options'],
    ['InReview', 'none'],
    ['Approved', 'none'],
    ['Rejected', 'none'],
  ];

  it.each(panelCases)('shows only the %s panel for status %s', (status, expected) => {
    expectLoadRequest().flush({ ...fakeChallenge, status });
    fixture.detectChanges();

    const problemPanel = fixture.debugElement.query(By.css('app-problem-statement-panel'));
    const optionsPanel = fixture.debugElement.query(By.css('app-solution-options-panel'));

    expect(problemPanel !== null).toBe(expected === 'problem-statement');
    expect(optionsPanel !== null).toBe(expected === 'solution-options');
  });
});
