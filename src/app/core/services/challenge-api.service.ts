import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Challenge,
  ChallengeStatus,
  CreateChallengeRequest,
  DraftProblemStatementResponse,
  DraftSolutionOptionsResponse,
  UpdateChallengeRequest,
} from '../models/challenge.model';
import { SolutionOption } from '../models/solution-option.model';

@Injectable({ providedIn: 'root' })
export class ChallengeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/challenges`;

  getChallenges(status?: ChallengeStatus): Observable<Challenge[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Challenge[]>(this.baseUrl, { params });
  }

  getChallenge(id: number): Observable<Challenge> {
    return this.http.get<Challenge>(`${this.baseUrl}/${id}`);
  }

  createChallenge(request: CreateChallengeRequest): Observable<Challenge> {
    return this.http.post<Challenge>(this.baseUrl, request);
  }

  updateChallenge(id: number, request: UpdateChallengeRequest): Observable<Challenge> {
    return this.http.put<Challenge>(`${this.baseUrl}/${id}`, request);
  }

  draftProblemStatement(id: number): Observable<DraftProblemStatementResponse> {
    return this.http.post<DraftProblemStatementResponse>(
      `${this.baseUrl}/${id}/draft-problem-statement`,
      {},
    );
  }

  draftSolutionOptions(id: number): Observable<DraftSolutionOptionsResponse> {
    return this.http.post<DraftSolutionOptionsResponse>(
      `${this.baseUrl}/${id}/draft-solution-options`,
      {},
    );
  }

  addOption(challengeId: number, text: string): Observable<SolutionOption> {
    return this.http.post<SolutionOption>(`${this.baseUrl}/${challengeId}/options`, { text });
  }

  selectOption(challengeId: number, optionId: number): Observable<Challenge> {
    return this.http.put<Challenge>(
      `${this.baseUrl}/${challengeId}/options/${optionId}/select`,
      {},
    );
  }

  updateStatus(challengeId: number, status: ChallengeStatus): Observable<Challenge> {
    return this.http.put<Challenge>(`${this.baseUrl}/${challengeId}/status`, { status });
  }
}
