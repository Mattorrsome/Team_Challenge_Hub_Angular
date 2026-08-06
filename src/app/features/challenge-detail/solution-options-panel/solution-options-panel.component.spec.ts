import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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
});
