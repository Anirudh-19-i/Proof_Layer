export enum Role {
  CANDIDATE = 'candidate',
  RECRUITER = 'recruiter',
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: Role;
  skills: Record<string, SkillDetail>;
  consistencyScore: number;
  learningVelocity: number;
  createdAt: string;
}

export interface SkillDetail {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  score: number;
  history: { date: string; score: number }[];
}

export interface Assessment {
  id: string;
  userId: string;
  round: 1 | 2 | 3;
  type: 'micro-task' | 'case-study' | 'inquiry';
  taskId: string;
  userInput: any;
  aiEvaluation?: {
    score: number;
    feedback: string;
    analysis: string;
    metrics: Record<string, number>;
  };
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  createdAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  userId: string;
  status: 'applied' | 'round1' | 'round2' | 'round3' | 'offered' | 'rejected';
  scores: Record<number, number>;
  shortlisted?: boolean;
  updatedAt: string;
}

export interface Notification {
  id: string;
  recruiterId: string;
  type: 'new_application' | 'candidate_progress';
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  round?: string;
  read: boolean;
  createdAt: string;
}

export interface Endorsement {
  id: string;
  endorserId: string;
  endorserName: string;
  recipientId: string;
  skillId: string;
  createdAt: string;
}
