import type {
  CommunityPost,
  JobGapInsight,
  DailyPlan,
  DailyPlanTask,
  LearningPreference,
  LearningStreak,
  MentorMemoryEntry,
  MentorReply,
  MockInterviewQuestion,
  MockInterviewSession,
  QuizQuestion,
  RankedResource,
  ReadinessSnapshot,
  RoadmapContent,
  Stage,
  StudyPlan,
  StudyPlanWeek,
} from "@/types/roadmap";

const STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "you",
  "your",
  "will",
  "this",
  "that",
  "from",
  "have",
  "are",
  "our",
  "their",
  "role",
  "experience",
  "years",
  "team",
  "work",
  "skills",
  "knowledge",
]);

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export function extractSkillsFromPosting(postingText: string) {
  const frequency = new Map<string, number>();

  for (const token of tokenize(postingText)) {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

  return [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([skill]) => skill);
}

export function computeAtsMatch(parsedResume: { skills?: string[] }, postingText: string) {
  const postingSkills = extractSkillsFromPosting(postingText);
  const resumeSkills = new Set((parsedResume.skills || []).map((s) => s.toLowerCase()));

  const matched = postingSkills.filter((skill) => [...resumeSkills].some((rs) => rs.includes(skill) || skill.includes(rs)));
  const missing = postingSkills.filter((skill) => !matched.includes(skill));
  const matchScore = postingSkills.length ? Math.round((matched.length / postingSkills.length) * 100) : 0;

  return {
    matchScore,
    matchedSkills: matched,
    missingSkills: missing,
    analyzedAt: new Date().toISOString(),
  };
}

export function analyzeJobGap(roadmap: RoadmapContent, postingText: string): JobGapInsight {
  const roadmapSkills = new Set(roadmap.stages.flatMap((stage) => stage.skills.map((skill) => skill.toLowerCase())));
  const postingSkills = extractSkillsFromPosting(postingText);

  const matchedSkills = postingSkills.filter((skill) => [...roadmapSkills].some((value) => value.includes(skill)));
  const missingSkills = postingSkills.filter((skill) => !matchedSkills.includes(skill));

  const matchScore = postingSkills.length
    ? Math.max(0, Math.min(100, Math.round((matchedSkills.length / postingSkills.length) * 100)))
    : 0;

  const recommendedNextActions = missingSkills.slice(0, 6).map((skill) => `Add a targeted task to practice ${skill}`);

  return {
    matchScore,
    matchedSkills,
    missingSkills,
    recommendedNextActions,
    analyzedAt: new Date().toISOString(),
  };
}

export function rankResources(resources: string[], preference: LearningPreference): RankedResource[] {
  return resources
    .map((resource, index) => {
      const text = resource.toLowerCase();
      const isVideo = /video|youtube|course|watch/.test(text);
      const isProject = /project|build|hands-on|exercise/.test(text);
      const type: LearningPreference = isProject ? "project" : isVideo ? "video" : "reading";

      const estimatedMinutes = /quick|short|intro|overview/.test(text) ? 45 : /deep|advanced|master/.test(text) ? 180 : 90;
      const difficulty = /advanced|expert|deep|master/.test(text)
        ? "advanced"
        : /intermediate/.test(text)
          ? "intermediate"
          : "beginner";

      const preferenceBoost = type === preference ? 20 : 0;
      const quickWin = estimatedMinutes <= 60;
      const baseScore = 100 - index * 4;
      const quickWinBoost = quickWin ? 10 : 0;

      return {
        label: resource,
        difficulty,
        estimatedMinutes,
        type,
        quickWin,
        score: Math.max(0, baseScore + preferenceBoost + quickWinBoost),
      } as RankedResource;
    })
    .sort((a, b) => b.score - a.score);
}

export function buildStudyPlan(stages: Stage[], hoursPerWeek: number, inRecoveryMode = false): StudyPlan {
  const safeHours = Math.max(1, Math.min(60, Math.round(hoursPerWeek)));
  const weeks: StudyPlanWeek[] = [];

  let week = 1;
  for (const stage of stages) {
    const stageEffort = Math.max(4, stage.skills.length * 2 + stage.resources.length);
    const targetHours = inRecoveryMode ? Math.max(2, Math.round(safeHours * 0.6)) : safeHours;
    const stageWeeks = Math.max(1, Math.ceil(stageEffort / targetHours));

    for (let i = 0; i < stageWeeks; i += 1) {
      const firstChunk = i === 0;
      weeks.push({
        week,
        focus: firstChunk ? stage.name : `${stage.name} - continuation`,
        estimatedHours: targetHours,
        isRecoveryWeek: inRecoveryMode,
        tasks: firstChunk
          ? [
              `Understand core outcomes: ${stage.name}`,
              ...stage.skills.slice(0, 3).map((skill) => `Practice: ${skill}`),
              ...(stage.resources[0] ? [`Resource focus: ${stage.resources[0]}`] : []),
            ]
          : [
              `Continue practical work in ${stage.name}`,
              "Review what is completed and unblock blockers",
            ],
      });
      week += 1;
    }
  }

  return {
    hoursPerWeek: safeHours,
    totalWeeks: weeks.length,
    weeks,
    autoReplanEnabled: true,
    generatedAt: new Date().toISOString(),
  };
}

export function updateStreak(previous?: LearningStreak): LearningStreak {
  const today = new Date();
  const isoDay = today.toISOString().slice(0, 10);

  if (!previous) {
    return {
      streakDays: 1,
      lastActiveDate: isoDay,
      missedDays: 0,
      recoveryMode: false,
    };
  }

  const previousDate = new Date(`${previous.lastActiveDate}T00:00:00.000Z`);
  const currentDate = new Date(`${isoDay}T00:00:00.000Z`);
  const diffDays = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return previous;
  }

  if (diffDays === 1) {
    return {
      streakDays: previous.streakDays + 1,
      lastActiveDate: isoDay,
      missedDays: 0,
      recoveryMode: false,
    };
  }

  const missedDays = diffDays - 1;
  return {
    streakDays: 1,
    lastActiveDate: isoDay,
    missedDays,
    recoveryMode: missedDays >= 3,
  };
}

export function applyWeeklyReplan(roadmap: RoadmapContent): RoadmapContent {
  const stages = roadmap.stages;
  const streak = roadmap.intelligence?.streak;
  const inRecoveryMode = Boolean(streak?.recoveryMode);

  const completedStageIds = new Set(
    roadmap.progress?.stageProgress.filter((stage) => stage.completed).map((stage) => stage.stageId) || []
  );

  const pendingStages = stages.filter((stage) => !completedStageIds.has(stage.id));
  const targetStages = pendingStages.length ? pendingStages : stages;
  const baseHours = roadmap.studyPlan?.hoursPerWeek || 6;
  const nextPlan = buildStudyPlan(targetStages, baseHours, inRecoveryMode);

  if (inRecoveryMode && nextPlan.weeks.length > 0) {
    nextPlan.weeks[0].tasks.unshift("Recovery week: rebuild momentum with smaller goals.");
  }

  return {
    ...roadmap,
    studyPlan: nextPlan,
  };
}

export function generateQuiz(stage: Stage, count = 5): QuizQuestion[] {
  const safeCount = Math.max(5, Math.min(10, Math.round(count)));
  const baseSkills = stage.skills.length ? stage.skills : ["core concept", "best practice", "workflow"];

  return Array.from({ length: safeCount }, (_, index) => {
    const skill = baseSkills[index % baseSkills.length];
    const options = [
      `Apply ${skill} using a practical example`,
      `Skip ${skill} and move ahead immediately`,
      `Memorize terms without implementation`,
      `Avoid feedback on ${skill}`,
    ];

    return {
      id: `${stage.id}-${index + 1}`,
      question: `What is the most effective way to improve ${skill} in ${stage.name}?`,
      options,
      answerIndex: 0,
      explanation: `Hands-on practice and reflection build durable mastery for ${skill}.`,
    };
  });
}

export function computeReadiness(roadmap: RoadmapContent): ReadinessSnapshot {
  const stageProgress = roadmap.progress?.stageProgress || [];
  const completedStages = stageProgress.filter((stage) => stage.completed).length;
  const stageTotal = roadmap.stages.length || 1;
  const skillTotal = roadmap.stages.reduce((sum, stage) => sum + stage.skills.length, 0) || 1;
  const completedSkills = stageProgress.reduce((sum, stage) => sum + stage.completedSkills.length, 0);

  const skillReadiness = Math.round((completedSkills / skillTotal) * 100);

  const evidenceCount = roadmap.intelligence?.portfolioEvidence?.length || 0;
  const portfolioReadiness = Math.min(100, evidenceCount * 20);

  const quizScores = roadmap.intelligence?.quizzes?.map((quiz) => quiz.lastScore || 0) || [];
  const interviewReadiness = quizScores.length
    ? Math.round(quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length)
    : Math.round((completedStages / stageTotal) * 70);

  const streak = roadmap.intelligence?.streak;
  const consistencyReadiness = streak
    ? Math.max(20, Math.min(100, streak.streakDays * 8 - (streak.recoveryMode ? 15 : 0)))
    : 25;

  const score = Math.round((skillReadiness + portfolioReadiness + interviewReadiness + consistencyReadiness) / 4);

  return {
    score,
    skillReadiness,
    portfolioReadiness,
    interviewReadiness,
    consistencyReadiness,
    generatedAt: new Date().toISOString(),
  };
}

export function generateAtsBullets(roadmap: RoadmapContent, completedStageIds: number[]) {
  const evidenceByStage = new Map<number, string[]>();
  for (const evidence of roadmap.intelligence?.portfolioEvidence || []) {
    const items = evidenceByStage.get(evidence.stageId) || [];
    items.push(evidence.title);
    evidenceByStage.set(evidence.stageId, items);
  }

  return roadmap.stages
    .filter((stage) => completedStageIds.includes(stage.id))
    .map((stage) => {
      const evidenceTitle = evidenceByStage.get(stage.id)?.[0];
      const skillSet = stage.skills.slice(0, 3).join(", ");
      const achievement = evidenceTitle ? `Delivered ${evidenceTitle}` : `Completed a production-style milestone in ${stage.name}`;
      return {
        stageId: stage.id,
        bullet: `${achievement} by applying ${skillSet}, improving readiness for ${roadmap.title} responsibilities.`,
      };
    });
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function summarizeRoadmapFocus(roadmap: RoadmapContent) {
  const nextStage = roadmap.stages.find((stage) => !roadmap.progress?.stageProgress?.some((item) => item.stageId === stage.id && item.completed));
  const completedCount = roadmap.progress?.stageProgress?.filter((item) => item.completed).length ?? 0;
  return {
    nextStage,
    completedCount,
    total: roadmap.stages.length,
  };
}

export function generateMentorReply(roadmap: RoadmapContent, prompt: string): MentorReply {
  const summary = summarizeRoadmapFocus(roadmap);
  const normalized = prompt.toLowerCase();
  const nextStageName = summary.nextStage?.name ?? roadmap.title;

  let response = `You should focus on ${nextStageName} next. You have completed ${summary.completedCount} of ${summary.total} stages.`;

  if (normalized.includes("stuck") || normalized.includes("block")) {
    response = `You are blocked on momentum, so shrink the task: finish one small artifact in ${nextStageName} today and document the result.`;
  } else if (normalized.includes("resume")) {
    response = `Your resume should highlight completed stages, portfolio evidence, and measurable outcomes. Turn each stage into one strong bullet.`;
  } else if (normalized.includes("interview")) {
    response = `For interviews, practice explaining tradeoffs, implementation choices, and one project story from ${nextStageName}.`;
  } else if (normalized.includes("plan")) {
    response = `A strong plan is: learn the core, build one artifact, review it, then repeat. Keep the next week centered on ${nextStageName}.`;
  }

  return {
    id: createId("mentor-reply"),
    prompt,
    response,
    createdAt: new Date().toISOString(),
  };
}

export function generateMockInterviewSession(roadmap: RoadmapContent, stage?: Stage): MockInterviewSession {
  const targetStage = stage ?? roadmap.stages[0];
  const focusSkills = targetStage?.skills.slice(0, 3) ?? ["problem solving", "system design", "ownership"];

  const questions: MockInterviewQuestion[] = [
    {
      id: createId("mock-q"),
      prompt: `Explain how you would approach ${targetStage?.name ?? roadmap.title}.`,
      hints: ["start with requirements", "break into milestones", "mention tradeoffs"],
      stageId: targetStage?.id,
    },
    {
      id: createId("mock-q"),
      prompt: `Describe a challenge you solved while working on ${targetStage?.name ?? "your roadmap"}.`,
      hints: ["structure the story", "mention blockers", "show measurable impact"],
      stageId: targetStage?.id,
    },
    {
      id: createId("mock-q"),
      prompt: `How do you improve your skill in ${focusSkills[0]}?`,
      hints: ["practice", "feedback", "iteration"],
      stageId: targetStage?.id,
    },
  ];

  return {
    id: createId("mock-session"),
    title: `${targetStage?.name ?? roadmap.title} mock interview`,
    questions,
    answers: {},
    createdAt: new Date().toISOString(),
  };
}

export function scoreMockInterview(session: MockInterviewSession) {
  const answeredCount = Object.values(session.answers).filter((answer) => answer.trim().length > 0).length;
  const detailBoost = Object.values(session.answers).reduce((sum, answer) => sum + (answer.trim().split(/\s+/).length >= 12 ? 1 : 0), 0);
  const total = session.questions.length || 1;
  return Math.min(100, Math.round(((answeredCount + detailBoost) / total) * 100));
}

export function generateDailyPlan(roadmap: RoadmapContent): DailyPlan {
  const today = new Date().toISOString().slice(0, 10);
  const nextStage = roadmap.stages.find((stage) => !roadmap.progress?.stageProgress?.some((item) => item.stageId === stage.id && item.completed)) ?? roadmap.stages[0];
  const focus = nextStage?.name ?? roadmap.title;

  const tasks: DailyPlanTask[] = [
    { id: createId("task"), label: `Review core concepts for ${focus}`, completed: false, minutes: 25 },
    { id: createId("task"), label: `Build one small artifact or feature`, completed: false, minutes: 45 },
    { id: createId("task"), label: `Write a short reflection and next step`, completed: false, minutes: 15 },
  ];

  return {
    id: createId("daily-plan"),
    date: today,
    focus,
    tasks,
    notes: `Keep the day small and ship one visible outcome for ${focus}.`,
  };
}

export function generateCommunityPost(author: string, topic: string, message: string): CommunityPost {
  return {
    id: createId("community-post"),
    author,
    topic,
    message,
    createdAt: new Date().toISOString(),
    likes: 0,
  };
}

export function createDefaultNetworkConnections(): RoadmapContent["intelligence"] {
  return undefined;
}
