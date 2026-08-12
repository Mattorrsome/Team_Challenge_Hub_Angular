import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StatusStepperComponent } from './status-stepper.component';
import { Challenge } from '../../../core/models/challenge.model';

describe('StatusStepperComponent', () => {
  let component: StatusStepperComponent;
  let fixture: ComponentFixture<StatusStepperComponent>;

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
      imports: [StatusStepperComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusStepperComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('challenge', fakeChallenge);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('marks the current status current, earlier steps done, later steps upcoming', () => {
    fixture.componentRef.setInput('challenge', { ...fakeChallenge, status: 'OptionSelected' });
    fixture.detectChanges();

    expect(component.steps().map((s) => s.state)).toEqual([
      'done',
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
    ]);
  });

  it('treats Rejected as off the linear path', () => {
    fixture.componentRef.setInput('challenge', { ...fakeChallenge, status: 'Rejected' });
    fixture.detectChanges();

    expect(component.steps().every((s) => s.state === 'upcoming')).toBe(true);
  });
});
