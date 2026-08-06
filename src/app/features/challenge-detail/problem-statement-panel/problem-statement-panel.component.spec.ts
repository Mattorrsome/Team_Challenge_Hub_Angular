import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { ProblemStatementPanelComponent } from './problem-statement-panel.component';
import { Challenge } from '../../../core/models/challenge.model';

describe('ProblemStatementPanelComponent', () => {
  let component: ProblemStatementPanelComponent;
  let fixture: ComponentFixture<ProblemStatementPanelComponent>;

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
      imports: [ProblemStatementPanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProblemStatementPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('challenge', fakeChallenge);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the server message when drafting fails', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    // A failed draft must not overwrite what the user has in the field.
    component.updateDraftText('my in-progress notes');

    component.requestDraft();
    httpMock
      .expectOne('/api/challenges/1/draft-problem-statement')
      .flush(
        { error: 'AI drafting is unavailable right now. Please try again.' },
        { status: 503, statusText: 'Service Unavailable' },
      );

    expect(component.draftError()).toBe('AI drafting is unavailable right now. Please try again.');
    expect(component.isDrafting()).toBe(false);
    expect(component.draftText()).toBe('my in-progress notes');
  });

  it('falls back to a generic message when the failure has no body', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.requestDraft();
    httpMock
      .expectOne('/api/challenges/1/draft-problem-statement')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });

    expect(component.draftError()).toBe('AI drafting is unavailable. Please try again.');
  });

  it('clears the error when a later draft succeeds', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.requestDraft();
    httpMock
      .expectOne('/api/challenges/1/draft-problem-statement')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    expect(component.draftError()).not.toBeNull();

    component.requestDraft();
    expect(component.draftError()).toBeNull();
    httpMock
      .expectOne('/api/challenges/1/draft-problem-statement')
      .flush({ problemStatement: 'Problem: slow deploys.' });

    expect(component.draftError()).toBeNull();
    expect(component.draftText()).toBe('Problem: slow deploys.');
  });

  it('renders the error message with role="alert" for screen readers', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.requestDraft();
    httpMock
      .expectOne('/api/challenges/1/draft-problem-statement')
      .flush(
        { error: 'AI drafting is unavailable right now. Please try again.' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    fixture.detectChanges();

    const alert = fixture.debugElement.query(By.css('[role="alert"]'));
    expect(alert).toBeTruthy();
    expect(alert.nativeElement.textContent).toContain(
      'AI drafting is unavailable right now. Please try again.',
    );
  });
});
