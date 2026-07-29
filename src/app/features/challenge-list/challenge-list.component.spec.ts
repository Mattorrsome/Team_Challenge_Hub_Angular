import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ChallengeListComponent } from './challenge-list.component';

describe('ChallengeListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ChallengeListComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
