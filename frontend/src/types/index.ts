export type UserRole = 'admin' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  semester: string;
  section: string;
  year: string;
  dept: string;
  enrollmentNumber?: string;
  registerNumber?: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  createdBy: string;
  createdAt: string;
  tags?: string[];
}

export interface Test {
  id: string;
  title: string;
  description: string;
  assignedTo: {
    semester: string[];
    departments: string[];
    section?: string[];
    year?: string[];
  };
  questions: string[]; // Question IDs
  durationMinutes: number;
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  startAt: string;
  endAt: string;
  createdBy: string;
  createdByName?: string;
  createdByEmail?: string;
  shareLink?: string;
}

export interface Answer {
  questionId: string;
  selectedOption: number;
  timeTakenSec: number;
}

export interface SuspiciousEvent {
  type: 'tab-switch' | 'fullscreen-exit' | 'copy-attempt' | 'paste-attempt' | 'context-menu' | 'inspect-attempt' | 'screenshot-attempt' | 'print-attempt' | 'ai-flagged' | 'copy-paste-attempt' | 'multiple-faces' | 'phone-detected';
  timestamp: string;
}

export interface Attempt {
  id: string;
  testId: string;
  testTitle?: string;
  studentId: string;
  answers: Answer[];
  score: number;
  startedAt: string;
  finishedAt?: string;
  submittedAt?: string;
  suspiciousEvents: SuspiciousEvent[];
  malpractice?: boolean;
  malpracticeReason?: string;
  autoSubmitted?: boolean;
}
