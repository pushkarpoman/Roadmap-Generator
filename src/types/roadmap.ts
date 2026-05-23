export type Stage = {
  id: number;
  name: string;
  duration: string;
  description: string;
  skills: string[];
  resources: string[];
};

export type LearningPreference = "video" | "project" | "reading";

export type RankedResource = {
  label: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  type: LearningPreference;
  quickWin: boolean;
  score: number;
};

export type StageProgress = {
  stageId: number;
  completed: boolean;
  completedSkills: string[];
};

export type SkillProofLevel = "learned" | "practiced" | "built" | "interview-ready";

export type SkillProof = {
  stageId: number;
  skill: string;
  level: SkillProofLevel;
};

export type PortfolioEvidence = {
  id: string;
  stageId: number;
  title: string;
  repoUrl?: string;
  demoUrl?: string;
  note?: string;
  addedAt: string;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type QuizAttempt = {
  score: number;
  total: number;
  takenAt: string;
};

export type StageQuiz = {
  stageId: number;
  questions: QuizQuestion[];
  lastScore?: number;
  takenAt?: string;
  attempts?: QuizAttempt[];
};

export type JobGapInsight = {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendedNextActions: string[];
  analyzedAt: string;
};

export type StudyPlanWeek = {
  week: number;
  focus: string;
  tasks: string[];
  estimatedHours: number;
  isRecoveryWeek?: boolean;
};

export type StudyPlan = {
  hoursPerWeek: number;
  totalWeeks: number;
  weeks: StudyPlanWeek[];
  autoReplanEnabled?: boolean;
  generatedAt?: string;
};

export type LearningStreak = {
  streakDays: number;
  lastActiveDate: string;
  missedDays: number;
  recoveryMode: boolean;
};

export type ReadinessSnapshot = {
  score: number;
  skillReadiness: number;
  portfolioReadiness: number;
  interviewReadiness: number;
  consistencyReadiness: number;
  generatedAt: string;
};

export type ResumeBullet = {
  stageId: number;
  bullet: string;
  sourceEvidenceId?: string;
};

export type CareerApplicationStatus = "saved" | "applied" | "interview" | "offer" | "rejected";

export type CareerApplication = {
  id: string;
  company: string;
  role: string;
  status: CareerApplicationStatus;
  appliedAt: string;
  note?: string;
  source?: string;
};

export type MentorMemoryEntry = {
  id: string;
  kind: "goal" | "preference" | "blocker" | "insight" | "reminder";
  text: string;
  createdAt: string;
};

export type MentorReply = {
  id: string;
  prompt: string;
  response: string;
  createdAt: string;
};

export type MockInterviewQuestion = {
  id: string;
  prompt: string;
  hints: string[];
  stageId?: number;
};

export type MockInterviewSession = {
  id: string;
  title: string;
  questions: MockInterviewQuestion[];
  answers: Record<string, string>;
  score?: number;
  createdAt: string;
  completedAt?: string;
};

export type DailyPlanTask = {
  id: string;
  label: string;
  completed: boolean;
  minutes: number;
};

export type DailyPlan = {
  id: string;
  date: string;
  focus: string;
  tasks: DailyPlanTask[];
  notes?: string;
};

export type CommunityPost = {
  id: string;
  author: string;
  message: string;
  topic: string;
  createdAt: string;
  likes: number;
};

export type NetworkConnection = {
  id: string;
  name: string;
  role: string;
  status: "invited" | "connected" | "mentor";
  lastSeenAt: string;
};

export type RoadmapIntelligence = {
  preference?: LearningPreference;
  rankedResources?: Record<number, RankedResource[]>;
  skillProofs?: SkillProof[];
  portfolioEvidence?: PortfolioEvidence[];
  quizzes?: StageQuiz[];
  jobGap?: JobGapInsight;
  readiness?: ReadinessSnapshot;
  resumeBullets?: ResumeBullet[];
  applications?: CareerApplication[];
  mentorMemory?: MentorMemoryEntry[];
  mentorReplies?: MentorReply[];
  mockInterviews?: MockInterviewSession[];
  dailyPlan?: DailyPlan;
  communityPosts?: CommunityPost[];
  networkConnections?: NetworkConnection[];
  streak?: LearningStreak;
};

export type RoadmapContent = {
  title: string;
  stages: Stage[];
  progress?: {
    stageProgress: StageProgress[];
    updatedAt: string;
  };
  studyPlan?: StudyPlan;
  intelligence?: RoadmapIntelligence;
};

export type UserDTO = {
  id: number;
  name: string;
  email: string;
};

export type RoadmapRecord = {
  id: number;
  title: string;
  content: RoadmapContent;
  createdAt: string;
};

export type JobGapRequest = {
  roadmap: RoadmapContent;
  postingText: string;
};

export type QuizRequest = {
  stage: Stage;
  count?: number;
};

export type BulletRequest = {
  roadmap: RoadmapContent;
  completedStageIds: number[];
};

export type ResumeParsed = {
  rawText: string;
  experience: { company?: string; role?: string; start?: string; end?: string; bullets: string[] }[];
  skills: string[];
  projects: { title?: string; description?: string; url?: string }[];
  parsedAt: string;
};

export type ReminderKind = "daily" | "weekly" | "replan" | "streak_recovery";

export type Reminder = {
  id: string;
  userId?: number;
  kind: ReminderKind;
  schedule: string; // cron or ISO date
  enabled: boolean;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type AnalyticsSnapshot = {
  applicationConversionRate?: number; // offers / applications
  weeklyConsistency?: { weekStart: string; actions: number }[];
  quizScoreTrend?: { date: string; averageScore: number }[];
  skillReadinessTrend?: { date: string; readinessScore: number }[];
};
