import { HttpClient, httpResource } from '@angular/common/http';
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

export interface ChallengeFilters {
  status: ChallengeStatus | null;
  userId: number | null;
}

@Injectable({ providedIn: 'root' })
export class ChallengeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/challenges`;

  /**
   * Reactive challenge list, keyed on the given filters. Re-fetches whenever a
   * signal read inside `filters` changes, superseding any in-flight request —
   * so switching the acting user cannot leave the previous user's challenges
   * on screen. Must be called from an injection context.
   */
  // ponytail: no error surface — callers only read .value()/.isLoading(), so a
  // failed fetch renders as "No challenges yet." rather than an error. The HTTP
  // interceptor still snackbars 5xx, so it isn't fully silent. Expose this
  // resource's .error() signal if empty-vs-failed needs distinguishing in the UI.
  // ponytail: return type inferred (HttpResourceRef<Challenge[]>); annotate it
  // explicitly if a caller ever needs the named type at a boundary.
  challengesResource(filters: () => ChallengeFilters) {
    return httpResource<Challenge[]>(
      () => {
        const { status, userId } = filters();
        const params: Record<string, string> = {};
        if (status) {
          params['status'] = status;
        }
        if (userId !== null) {
          params['userId'] = String(userId);
        }
        return { url: this.baseUrl, params };
      },
      { defaultValue: [] },
    );
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
