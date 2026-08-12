import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { SolutionOptionsPanelComponent } from './solution-options-panel.component';
import { Challenge } from '../../../core/models/challenge.model';

describe('SolutionOptionsPanelComponent', () => {
  let component: SolutionOptionsPanelComponent;
  let fixture: ComponentFixture<SolutionOptionsPanelComponent>;

  const fakeChallenge: Challenge = {
    id: 1,
    title: 'Improve deploy pipeline',
    rawNotes: 'Deploys take too long.',
    problemStatement: 'Deploys are slow because of manual gates.',
    status: 'ProblemStatementDrafted',
    submittedByUserId: 1,
    submittedByName: 'Alex Kim',
    createdAt: '2026-07-29T00:00:00Z',
    updatedAt: '2026-07-29T00:00:00Z',
    options: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolutionOptionsPanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SolutionOptionsPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('challenge', fakeChallenge);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hides the draft and select controls when canEdit is false', () => {
    const fixture = TestBed.createComponent(SolutionOptionsPanelComponent);
    fixture.componentInstance.challenge = {
      ...fakeChallenge,
      problemStatement: 'A statement.',
      status: 'OptionsDrafted',
      options: [
        { id: 1, text: 'An accepted option', isSelected: false, createdAt: '2026-07-29T00:00:00Z' },
      ],
    };
    fixture.componentInstance.canEdit = false;
    fixture.detectChanges();

    // The read-only list still renders...
    expect(fixture.nativeElement.textContent).toContain('An accepted option');
    // ...but nothing actionable does.
    expect(fixture.debugElement.queryAll(By.css('button')).length).toBe(0);
  });

  it('shows the draft and select controls when canEdit is true', () => {
    const fixture = TestBed.createComponent(SolutionOptionsPanelComponent);
    fixture.componentInstance.challenge = {
      ...fakeChallenge,
      problemStatement: 'A statement.',
      status: 'OptionsDrafted',
      options: [
        { id: 1, text: 'An accepted option', isSelected: false, createdAt: '2026-07-29T00:00:00Z' },
      ],
    };
    fixture.componentInstance.canEdit = true;
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('button')).length).toBe(2);
  });

  it('hides the drafting controls but still offers Select once an option is selected', () => {
    const fixture = TestBed.createComponent(SolutionOptionsPanelComponent);
    fixture.componentInstance.challenge = {
      ...fakeChallenge,
      problemStatement: 'A statement.',
      status: 'OptionSelected',
      options: [
        { id: 1, text: 'Automate the gates.', isSelected: false, createdAt: '2026-07-29T00:00:00Z' },
        { id: 2, text: 'Split the pipeline.', isSelected: true, createdAt: '2026-07-29T00:00:00Z' },
      ],
    };
    fixture.componentInstance.canEdit = true;
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const buttonLabels = buttons.map((b) => b.nativeElement.getAttribute('aria-label'));
    const buttonText = buttons.map((b) => b.nativeElement.textContent.trim());

    // Asserted by label, not by count: at OptionSelected the button count moves
    // for two independent reasons, so a count can't say which behaviour broke.
    // The label is also what the tooltip and a screen reader both read. It is
    // prefix-checked, not exact-matched, because it includes the option text
    // so that a screen reader can tell the rows apart.
    expect(buttonLabels.some((label) => label?.startsWith('Select option:'))).toBe(true);
    expect(buttonText).not.toContain('Draft Solution Options');
    // The selected row is marked for styling and shows no Select of its own.
    const selectedRow = fixture.debugElement.query(By.css('.solution-options-panel__selected-row'));
    expect(selectedRow).not.toBeNull();
    expect(selectedRow.nativeElement.textContent).toContain('Split the pipeline.');
    expect(selectedRow.query(By.css('button'))).toBeNull();
  });

  it('shows the server message when drafting options fails, preserving existing drafts', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    // Seed real state through the public API: a successful draft first.
    component.requestDrafts();
    httpMock
      .expectOne('/api/challenges/1/draft-solution-options')
      .flush({ options: ['Automate the gates.', 'Split the pipeline.'] });
    expect(component.draftOptions()).toEqual(['Automate the gates.', 'Split the pipeline.']);

    component.requestDrafts();
    httpMock
      .expectOne('/api/challenges/1/draft-solution-options')
      .flush(
        { error: 'AI drafting is unavailable right now. Please try again.' },
        { status: 503, statusText: 'Service Unavailable' },
      );

    expect(component.draftError()).toBe('AI drafting is unavailable right now. Please try again.');
    expect(component.isDrafting()).toBe(false);
    expect(component.draftOptions()).toEqual(['Automate the gates.', 'Split the pipeline.']);
  });

  it('falls back to a generic message when the failure has no body', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.requestDrafts();
    httpMock
      .expectOne('/api/challenges/1/draft-solution-options')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });

    expect(component.draftError()).toBe('AI drafting is unavailable. Please try again.');
  });

  it('clears the error when a later draft succeeds', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.requestDrafts();
    httpMock
      .expectOne('/api/challenges/1/draft-solution-options')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
    expect(component.draftError()).not.toBeNull();

    component.requestDrafts();
    expect(component.draftError()).toBeNull();
    httpMock
      .expectOne('/api/challenges/1/draft-solution-options')
      .flush({ options: ['Automate the gates.', 'Split the pipeline.'] });

    expect(component.draftError()).toBeNull();
    expect(component.draftOptions().length).toBe(2);
  });

  it('renders the error message with role="alert" for screen readers', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.requestDrafts();
    httpMock
      .expectOne('/api/challenges/1/draft-solution-options')
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

  it('marks the selected option with a labelled icon, not text', () => {
    const fixture = TestBed.createComponent(SolutionOptionsPanelComponent);
    fixture.componentInstance.challenge = {
      ...fakeChallenge,
      problemStatement: 'A statement.',
      status: 'OptionSelected',
      options: [
        { id: 2, text: 'Split the pipeline.', isSelected: true, createdAt: '2026-07-29T00:00:00Z' },
      ],
    };
    fixture.componentInstance.canEdit = true;
    fixture.detectChanges();

    const selectedRow = fixture.debugElement.query(
      By.css('.solution-options-panel__selected-row'),
    );
    const icon = selectedRow.query(By.css('mat-icon'));

    expect(icon).not.toBeNull();
    expect(icon.nativeElement.textContent.trim()).toBe('check_circle');
    expect(icon.nativeElement.getAttribute('aria-label')).toBe('Selected option');
    // MatIcon defaults to aria-hidden="true"; without an explicit override the
    // label above is never reachable by assistive tech.
    expect(icon.nativeElement.getAttribute('aria-hidden')).not.toBe('true');
    // The word itself is gone.
    expect(selectedRow.nativeElement.textContent).not.toContain('Selected');
  });
});
