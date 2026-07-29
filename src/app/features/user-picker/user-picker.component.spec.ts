import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { UserPickerComponent } from './user-picker.component';

describe('UserPickerComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserPickerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(UserPickerComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
