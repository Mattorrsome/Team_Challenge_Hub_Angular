import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChallengeFormComponent } from './challenge-form.component';
import { environment } from '../../../environments/environment';
import { Challenge } from '../../core/models/challenge.model';

describe('ChallengeFormComponent', () => {
  let fixture: ComponentFixture<ChallengeFormComponent>;
  let component: ChallengeFormComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeFormComponent, ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { mode: 'create' }, paramMap: { get: () => null } } },
        },
        // Component navigates on successful save; a real Router has no routes
        // configured here and would reject with NG04002 once the request resolves.
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChallengeFormComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('does not emit when required fields are empty', () => {
    const emitted: unknown[] = [];
    component.formSubmit.subscribe((value) => emitted.push(value));

    component.onSubmit();

    expect(emitted.length).toBe(0);
    expect(component.form.invalid).toBe(true);
  });

  it('emits the correct payload on valid submit', () => {
    const emitted: unknown[] = [];
    component.formSubmit.subscribe((value) => emitted.push(value));

    component.form.setValue({ title: 'Improve deploy pipeline', rawNotes: 'Deploys take too long.' });
    component.onSubmit();

    expect(emitted).toEqual([
      { title: 'Improve deploy pipeline', rawNotes: 'Deploys take too long.' },
    ]);

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/challenges`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Improve deploy pipeline',
      rawNotes: 'Deploys take too long.',
    });

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
    req.flush(fakeChallenge);
  });
});
