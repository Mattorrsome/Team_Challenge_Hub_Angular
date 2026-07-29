import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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
});
