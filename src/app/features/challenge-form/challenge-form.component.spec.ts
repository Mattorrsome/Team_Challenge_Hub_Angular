import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ChallengeFormComponent } from './challenge-form.component';

describe('ChallengeFormComponent', () => {
  let fixture: ComponentFixture<ChallengeFormComponent>;
  let component: ChallengeFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeFormComponent, ReactiveFormsModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { mode: 'create' }, paramMap: { get: () => null } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChallengeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
  });
});
