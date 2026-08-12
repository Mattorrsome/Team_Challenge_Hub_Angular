import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ChallengeDetailComponent } from './challenge-detail.component';
import { environment } from '../../../environments/environment';
import { Challenge, ChallengeStatus } from '../../core/models/challenge.model';
import { AuthService } from '../../core/auth/auth.service';

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
    submittedByName: 'Alex Kim',
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
    vi.restoreAllMocks();
  });

  function expectLoadRequest() {
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/challenges/1`);
    expect(req.request.method).toBe('GET');
    return req;
  }

  function signInAs(id: number, username: string, role: 'Collaborator' | 'Admin') {
    TestBed.inject(AuthService).signIn(username, 'ChangeMe123!').subscribe();
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/signin`).flush({ id, username, role });
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
    ['ProblemStatementDrafted', 'solution-options'],
    ['OptionsDrafted', 'solution-options'],
    ['OptionSelected', 'solution-options'],
    ['InReview', 'none'],
    ['Approved', 'none'],
    ['Rejected', 'none'],
  ];

  it.each(panelCases)('shows only the %s panel for status %s', (status, expected) => {
    // Seeded as the owner: this test exercises panel-switching by status, not ownership.
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush({ ...fakeChallenge, status });
    fixture.detectChanges();

    const problemPanel = fixture.debugElement.query(By.css('app-problem-statement-panel'));
    const optionsPanel = fixture.debugElement.query(By.css('app-solution-options-panel'));

    expect(problemPanel !== null).toBe(expected === 'problem-statement');
    expect(optionsPanel !== null).toBe(expected === 'solution-options');
  });

  it('shows the accepted problem statement as read-only text once it is set', () => {
    expectLoadRequest().flush({
      ...fakeChallenge,
      status: 'OptionsDrafted',
      problemStatement: 'Problem: Deploys take too long.',
    });
    fixture.detectChanges();

    const section = fixture.debugElement.query(By.css('.challenge-detail__problem-statement'));
    expect(section).not.toBeNull();
    expect(section.nativeElement.textContent).toContain('Deploys take too long');
    // Read-only: the editable problem-statement panel must not be mounted here.
    expect(fixture.debugElement.query(By.css('app-problem-statement-panel'))).toBeNull();
  });

  it('does not show a problem statement section before one is accepted', () => {
    expectLoadRequest().flush({ ...fakeChallenge, status: 'Submitted', problemStatement: null });
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('.challenge-detail__problem-statement')),
    ).toBeNull();
  });

  it('renders the status stepper below the header but above the notes and problem statement', () => {
    expectLoadRequest().flush({
      ...fakeChallenge,
      status: 'OptionsDrafted',
      problemStatement: 'Problem: Deploys take too long.',
    });
    fixture.detectChanges();

    const root: HTMLElement = fixture.debugElement.query(By.css('.challenge-detail')).nativeElement;
    // Angular's control-flow anchors are comment nodes, so `children` sees only
    // the rendered elements and their order is the template order.
    const children = Array.from(root.children);
    const indexOfTag = (tag: string) =>
      children.findIndex((el) => el.tagName.toLowerCase() === tag);
    const indexOfClass = (cls: string) => children.findIndex((el) => el.classList.contains(cls));

    const headerIndex = indexOfClass('challenge-detail__header');
    const stepperIndex = indexOfTag('app-status-stepper');
    const notesIndex = indexOfClass('challenge-detail__raw-notes');
    const statementIndex = indexOfClass('challenge-detail__problem-statement');

    expect(stepperIndex).toBeGreaterThan(headerIndex);
    expect(stepperIndex).toBeLessThan(notesIndex);
    expect(stepperIndex).toBeLessThan(statementIndex);
  });

  it('shows the selected option below the problem statement while in review', () => {
    expectLoadRequest().flush({
      ...fakeChallenge,
      status: 'InReview',
      problemStatement: 'Problem: Deploys take too long.',
      options: [
        { id: 1, text: 'Automate the gates.', isSelected: false, createdAt: '2026-07-29T00:00:00Z' },
        { id: 2, text: 'Split the pipeline.', isSelected: true, createdAt: '2026-07-29T00:00:00Z' },
      ],
    });
    fixture.detectChanges();

    const section = fixture.debugElement.query(By.css('.challenge-detail__selected-option'));
    expect(section).not.toBeNull();
    expect(section.nativeElement.textContent).toContain('Split the pipeline.');
    // Only the selected option — not the whole list.
    expect(section.nativeElement.textContent).not.toContain('Automate the gates.');
  });

  it('does not show the selected option section outside review', () => {
    expectLoadRequest().flush({
      ...fakeChallenge,
      status: 'OptionSelected',
      problemStatement: 'Problem: Deploys take too long.',
      options: [
        { id: 2, text: 'Split the pipeline.', isSelected: true, createdAt: '2026-07-29T00:00:00Z' },
      ],
    });
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.challenge-detail__selected-option'))).toBeNull();
  });

  it('lets the owner edit', () => {
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(component.canEdit()).toBe(true);
    expect(fixture.debugElement.query(By.css('.challenge-detail__header a'))).not.toBe(null);
  });

  it('hides the edit link from a non-owner collaborator', () => {
    signInAs(2, 'jordan.patel', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(component.canEdit()).toBe(false);
    expect(fixture.debugElement.query(By.css('.challenge-detail__header a'))).toBe(null);
  });

  it('lets an admin edit someone else\'s challenge', () => {
    signInAs(2, 'jordan.patel', 'Admin');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(component.canEdit()).toBe(true);
    expect(fixture.debugElement.query(By.css('.challenge-detail__header a'))).not.toBe(null);
  });

  it('hides the problem-statement panel from a non-owner', () => {
    signInAs(2, 'jordan.patel', 'Collaborator');
    // fakeChallenge is Submitted, so currentPanel() is 'problem-statement'.
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-problem-statement-panel'))).toBe(null);
  });

  it('shows a delete button to the owner', () => {
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.challenge-detail__header button'))).not.toBe(null);
  });

  it('hides the delete button from a non-owner collaborator', () => {
    signInAs(2, 'jordan.patel', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.challenge-detail__header button'))).toBe(null);
  });

  it('shows a delete button to an admin on someone else\'s challenge', () => {
    // fakeChallenge is submittedByUserId 1, so this admin is not the owner.
    signInAs(2, 'jordan.patel', 'Admin');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.challenge-detail__header button'))).not.toBe(null);
  });

  it('sends no request when the delete confirmation is declined', () => {
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    fixture.debugElement
      .query(By.css('.challenge-detail__header button'))
      .nativeElement.click();

    // afterEach's httpMock.verify() would fail if a DELETE had been issued.
    httpMock.expectNone(`${environment.apiBaseUrl}/challenges/1`);
  });

  it('navigates to the list after a successful delete', () => {
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.debugElement
      .query(By.css('.challenge-detail__header button'))
      .nativeElement.click();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/challenges/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(navigate).toHaveBeenCalledWith(['/challenges']);
  });

  it('navigates to the list when the challenge was already deleted', () => {
    // A 404 means someone else deleted it first. The user's goal is met, so
    // this is not an error to report.
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture.debugElement
      .query(By.css('.challenge-detail__header button'))
      .nativeElement.click();

    httpMock
      .expectOne(`${environment.apiBaseUrl}/challenges/1`)
      .flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(navigate).toHaveBeenCalledWith(['/challenges']);
  });

  it('names the author on someone else\'s challenge', () => {
    // fakeChallenge is submittedByUserId 1; sign in as a different user.
    signInAs(2, 'jordan.patel', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    const byline = fixture.debugElement.query(By.css('.challenge-detail__author'));
    expect(byline).not.toBeNull();
    expect(byline.nativeElement.textContent).toContain('Alex Kim');
  });

  it('does not name the author on your own challenge', () => {
    signInAs(1, 'alex.kim', 'Collaborator');
    expectLoadRequest().flush(fakeChallenge);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.challenge-detail__author'))).toBeNull();
  });
});
