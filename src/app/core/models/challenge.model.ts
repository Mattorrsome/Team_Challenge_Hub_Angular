import { SolutionOption } from './solution-option.model';

export type ChallengeStatus =
  | 'Submitted'
  | 'ProblemStatementDrafted'
  | 'OptionsDrafted'
  | 'OptionSelected'
  | 'InReview'
  | 'Approved'
  | 'Rejected';

export interface Challenge {
  id: number;
  title: string;
  rawNotes: string;
  problemStatement: string | null;
  status: ChallengeStatus;
  submittedByUserId: number;
  createdAt: string;
  updatedAt: string;
  options: SolutionOption[];
}

export interface CreateChallengeRequest {
  title: string;
  rawNotes: string;
}

export interface UpdateChallengeRequest {
  title: string;
  problemStatement: string | null;
}

export interface DraftProblemStatementResponse {
  text: string;
}

export interface DraftSolutionOptionsResponse {
  options: string[];
}
