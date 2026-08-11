import { SolutionOption } from './solution-option.model';

export type ChallengeStatus =
  | 'Submitted'
  | 'ProblemStatementDrafted'
  | 'OptionsDrafted'
  | 'OptionSelected'
  | 'InReview'
  | 'Approved'
  | 'Rejected';

/**
 * Display text for each status. Shared by the status badge and the list
 * filter so a new status cannot pick up two different spellings. The
 * Record type keeps it exhaustive: adding a status to the union without a
 * label here is a compile error.
 */
export const STATUS_LABELS: Record<ChallengeStatus, string> = {
  Submitted: 'Submitted',
  ProblemStatementDrafted: 'Problem Statement Drafted',
  OptionsDrafted: 'Options Drafted',
  OptionSelected: 'Option Selected',
  InReview: 'In Review',
  Approved: 'Approved',
  Rejected: 'Rejected',
};

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
  problemStatement: string;
}

export interface DraftSolutionOptionsResponse {
  options: string[];
}
