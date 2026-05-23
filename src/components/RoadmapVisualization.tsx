"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import type {
  CareerApplication,
  CareerApplicationStatus,
  CommunityPost,
  DailyPlan,
  MentorMemoryEntry,
  MentorReply,
  MockInterviewSession,
  PortfolioEvidence,
  QuizQuestion,
  RoadmapContent,
  StageProgress,
} from "@/types/roadmap";
import {
  analyzeRoadmapJobGap,
  generateStageQuiz,
  generateResumeBullets,
  replanRoadmapWeekly,
} from "@/services/api";
import {
  analyzeJobGap,
  applyWeeklyReplan,
  computeReadiness,
  generateAtsBullets,
  generateCommunityPost,
  generateDailyPlan,
  generateMentorReply,
  generateMockInterviewSession,
  generateQuiz,
  scoreMockInterview,
  updateStreak,
} from "@/lib/roadmap-intelligence";

type RoadmapVisualizationProps = {
  roadmap: RoadmapContent;
  canPersist?: boolean;
  onRoadmapChange?: (nextRoadmap: RoadmapContent) => void | Promise<void>;
};

function buildProgressMap(roadmap: RoadmapContent): Record<number, boolean> {
  const stageProgress = roadmap.progress?.stageProgress ?? [];
  const fromRoadmap = new Map<number, boolean>(stageProgress.map((entry) => [entry.stageId, entry.completed]));

  return roadmap.stages.reduce<Record<number, boolean>>((acc, stage) => {
    acc[stage.id] = fromRoadmap.get(stage.id) ?? false;
    return acc;
  }, {});
}

function clampPercent(value: number): number {
  if (Number.isNaN(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function upsertQuizAttempt(
  roadmap: RoadmapContent,
  stageId: number,
  questions: QuizQuestion[],
  score: number,
  total: number,
) {
  const takenAt = new Date().toISOString();
  const existingQuizzes = roadmap.intelligence?.quizzes ?? [];
  const nextQuiz = {
    stageId,
    questions,
    lastScore: score,
    takenAt,
    attempts: [
      ...(existingQuizzes.find((quiz) => quiz.stageId === stageId)?.attempts ?? []),
      { score, total, takenAt },
    ].slice(-5),
  };

  return [
    ...existingQuizzes.filter((quiz) => quiz.stageId !== stageId),
    nextQuiz,
  ];
}

function upsertPortfolioEvidence(roadmap: RoadmapContent, evidence: PortfolioEvidence) {
  const existingEvidence = roadmap.intelligence?.portfolioEvidence ?? [];

  return [
    ...existingEvidence.filter((item) => item.id !== evidence.id),
    evidence,
  ];
}

function upsertMentorMemory(roadmap: RoadmapContent, entry: MentorMemoryEntry) {
  const existingMemory = roadmap.intelligence?.mentorMemory ?? [];
  return [...existingMemory.filter((item) => item.id !== entry.id), entry];
}

function upsertMentorReply(roadmap: RoadmapContent, reply: MentorReply) {
  const existingReplies = roadmap.intelligence?.mentorReplies ?? [];
  return [...existingReplies.slice(-11), reply].slice(-12);
}

function upsertMockInterviewSession(roadmap: RoadmapContent, session: MockInterviewSession) {
  const existingSessions = roadmap.intelligence?.mockInterviews ?? [];
  return [...existingSessions.filter((item) => item.id !== session.id), session].slice(-8);
}

function upsertDailyPlan(roadmap: RoadmapContent, plan: DailyPlan) {
  return plan;
}

function upsertCommunityPost(roadmap: RoadmapContent, post: CommunityPost) {
  const existingPosts = roadmap.intelligence?.communityPosts ?? [];
  return [post, ...existingPosts].slice(0, 12);
}

function upsertConnection(roadmap: RoadmapContent, name: string, role: string) {
  const existing = roadmap.intelligence?.networkConnections ?? [];
  return [
    {
      id: createId("connection"),
      name,
      role,
      status: "invited" as const,
      lastSeenAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, 8);
}

export default function RoadmapVisualization({
  roadmap,
  canPersist = false,
  onRoadmapChange,
}: RoadmapVisualizationProps) {
  const [viewRoadmap, setViewRoadmap] = useState<RoadmapContent>(roadmap);
  const [jobPostingText, setJobPostingText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gapLoading, setGapLoading] = useState(false);
  const [replanLoading, setReplanLoading] = useState(false);
  const [bulletLoading, setBulletLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [selectedQuizStageId, setSelectedQuizStageId] = useState<number>(roadmap.stages[0]?.id ?? 0);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [evidenceStageId, setEvidenceStageId] = useState<number>(roadmap.stages[0]?.id ?? 0);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceRepoUrl, setEvidenceRepoUrl] = useState("");
  const [evidenceDemoUrl, setEvidenceDemoUrl] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [applicationCompany, setApplicationCompany] = useState("");
  const [applicationRole, setApplicationRole] = useState("");
  const [applicationSource, setApplicationSource] = useState("");
  const [applicationNote, setApplicationNote] = useState("");
  const [applicationStatus, setApplicationStatus] = useState<CareerApplicationStatus>("saved");
  const [mentorKind, setMentorKind] = useState<MentorMemoryEntry["kind"]>("insight");
  const [mentorText, setMentorText] = useState("");
  const [mentorPrompt, setMentorPrompt] = useState("");
  const [activeInterview, setActiveInterview] = useState<MockInterviewSession | null>(null);
  const [interviewAnswers, setInterviewAnswers] = useState<Record<string, string>>({});
  const [interviewStageId, setInterviewStageId] = useState<number>(roadmap.stages[0]?.id ?? 0);
  const [interviewFeedback, setInterviewFeedback] = useState<string | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(roadmap.intelligence?.dailyPlan ?? null);
  const [communityMessage, setCommunityMessage] = useState("");
  const [communityTopic, setCommunityTopic] = useState("career accountability");
  const [communityAuthor, setCommunityAuthor] = useState("You");
  const [connectionName, setConnectionName] = useState("");
  const [connectionRole, setConnectionRole] = useState("");

  useEffect(() => {
    setViewRoadmap(roadmap);
    setSelectedQuizStageId(roadmap.stages[0]?.id ?? 0);
    setEvidenceStageId(roadmap.stages[0]?.id ?? 0);
    setInterviewStageId(roadmap.stages[0]?.id ?? 0);
    setDailyPlan(roadmap.intelligence?.dailyPlan ?? null);
  }, [roadmap]);

  const progressMap = buildProgressMap(viewRoadmap);
  const existingProgress = new Map<number, StageProgress>(
    (viewRoadmap.progress?.stageProgress ?? []).map((entry) => [entry.stageId, entry]),
  );

  const completedStages = useMemo(
    () => viewRoadmap.stages.filter((stage) => progressMap[stage.id]).length,
    [viewRoadmap.stages, progressMap],
  );
  const totalStages = viewRoadmap.stages.length;
  const completionPercent = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

  const { maxSkills, maxResources } = useMemo(() => {
    let skillPeak = 1;
    let resourcePeak = 1;

    viewRoadmap.stages.forEach((stage) => {
      if (stage.skills.length > skillPeak) skillPeak = stage.skills.length;
      if (stage.resources.length > resourcePeak) resourcePeak = stage.resources.length;
    });

    return { maxSkills: skillPeak, maxResources: resourcePeak };
  }, [viewRoadmap.stages]);

  const readiness = useMemo(
    () => viewRoadmap.intelligence?.readiness ?? computeReadiness(viewRoadmap),
    [viewRoadmap],
  );

  const applyRoadmapUpdate = async (nextRoadmap: RoadmapContent, successMessage: string) => {
    setViewRoadmap(nextRoadmap);
    setError(null);
    setMessage(successMessage);

    if (onRoadmapChange) {
      try {
        await onRoadmapChange(nextRoadmap);
      } catch (persistError) {
        const nextMessage = persistError instanceof Error ? persistError.message : "Failed to persist roadmap update";
        setError(nextMessage);
      }
    }
  };

  const handleToggleStage = (stageId: number) => {
    const nextStageProgress: StageProgress[] = viewRoadmap.stages.map((stage) => ({
      stageId: stage.id,
      completed: stage.id === stageId ? !progressMap[stage.id] : progressMap[stage.id],
      completedSkills: existingProgress.get(stage.id)?.completedSkills ?? [],
    }));

    const nextRoadmap: RoadmapContent = {
      ...viewRoadmap,
      progress: {
        stageProgress: nextStageProgress,
        updatedAt: new Date().toISOString(),
      },
    };

    void applyRoadmapUpdate(nextRoadmap, "Progress updated");
  };

  const handleAnalyzeGap = async () => {
    const trimmedPosting = jobPostingText.trim();
    if (!trimmedPosting) {
      setError("Paste a target job description first");
      return;
    }

    setGapLoading(true);
    setError(null);
    setMessage(null);

    try {
      const insight = canPersist
        ? await analyzeRoadmapJobGap(viewRoadmap, trimmedPosting)
        : analyzeJobGap(viewRoadmap, trimmedPosting);

      const nextRoadmap: RoadmapContent = {
        ...viewRoadmap,
        intelligence: {
          ...viewRoadmap.intelligence,
          jobGap: insight,
        },
      };

      await applyRoadmapUpdate(nextRoadmap, "Job-gap analysis completed");
    } catch (analysisError) {
      const nextMessage = analysisError instanceof Error ? analysisError.message : "Failed to analyze job gap";
      setError(nextMessage);
    } finally {
      setGapLoading(false);
    }
  };

  const handleWeeklyReplan = async () => {
    setReplanLoading(true);
    setError(null);
    setMessage(null);

    try {
      const nextRoadmap = canPersist
        ? await replanRoadmapWeekly(viewRoadmap)
        : (() => {
            const streak = updateStreak(viewRoadmap.intelligence?.streak);
            const replanned = applyWeeklyReplan({
              ...viewRoadmap,
              intelligence: {
                ...viewRoadmap.intelligence,
                streak,
              },
            });

            return {
              ...replanned,
              intelligence: {
                ...replanned.intelligence,
                readiness: computeReadiness(replanned),
              },
            };
          })();

      await applyRoadmapUpdate(nextRoadmap, "Weekly plan regenerated based on current progress");
    } catch (replanError) {
      const nextMessage = replanError instanceof Error ? replanError.message : "Failed to replan roadmap";
      setError(nextMessage);
    } finally {
      setReplanLoading(false);
    }
  };

  const handleGenerateBullets = async () => {
    const completedStageIds = viewRoadmap.stages.filter((stage) => progressMap[stage.id]).map((stage) => stage.id);

    if (!completedStageIds.length) {
      setError("Mark at least one stage as complete to generate resume bullets");
      return;
    }

    setBulletLoading(true);
    setError(null);
    setMessage(null);

    try {
      const bullets = canPersist
        ? await generateResumeBullets(viewRoadmap, completedStageIds)
        : generateAtsBullets(viewRoadmap, completedStageIds);

      const nextRoadmap: RoadmapContent = {
        ...viewRoadmap,
        intelligence: {
          ...viewRoadmap.intelligence,
          resumeBullets: bullets,
        },
      };

      await applyRoadmapUpdate(nextRoadmap, "Resume bullets generated from completed stages");
    } catch (bulletError) {
      const nextMessage = bulletError instanceof Error ? bulletError.message : "Failed to generate bullets";
      setError(nextMessage);
    } finally {
      setBulletLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    const stage = viewRoadmap.stages.find((item) => item.id === selectedQuizStageId);
    if (!stage) {
      setError("Select a stage before generating a quiz");
      return;
    }

    setQuizLoading(true);
    setError(null);
    setMessage(null);

    try {
      const questions = canPersist ? await generateStageQuiz(stage, 5) : generateQuiz(stage, 5);
      setQuizQuestions(questions);
      setQuizAnswers({});
      setMessage(`Generated quiz for ${stage.name}`);
    } catch (quizError) {
      const nextMessage = quizError instanceof Error ? quizError.message : "Failed to generate quiz";
      setError(nextMessage);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizQuestions.length) {
      setError("Generate a quiz first");
      return;
    }

    const correctCount = quizQuestions.reduce(
      (sum, question) => sum + (quizAnswers[question.id] === question.answerIndex ? 1 : 0),
      0,
    );
    const total = quizQuestions.length;
    const score = Math.round((correctCount / total) * 100);

    setQuizSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const nextRoadmap: RoadmapContent = {
        ...viewRoadmap,
        intelligence: {
          ...viewRoadmap.intelligence,
          quizzes: upsertQuizAttempt(viewRoadmap, selectedQuizStageId, quizQuestions, score, total),
          readiness: computeReadiness({
            ...viewRoadmap,
            intelligence: {
              ...viewRoadmap.intelligence,
              quizzes: upsertQuizAttempt(viewRoadmap, selectedQuizStageId, quizQuestions, score, total),
            },
          }),
        },
      };

      await applyRoadmapUpdate(nextRoadmap, `Quiz submitted: ${score}% score`);
    } catch (quizSubmitError) {
      const nextMessage = quizSubmitError instanceof Error ? quizSubmitError.message : "Failed to submit quiz";
      setError(nextMessage);
    } finally {
      setQuizSubmitting(false);
    }
  };

  const handleAddEvidence = async () => {
    if (!evidenceTitle.trim()) {
      setError("Add a portfolio evidence title");
      return;
    }

    const evidence: PortfolioEvidence = {
      id: createId("evidence"),
      stageId: evidenceStageId,
      title: evidenceTitle.trim(),
      repoUrl: evidenceRepoUrl.trim() || undefined,
      demoUrl: evidenceDemoUrl.trim() || undefined,
      note: evidenceNote.trim() || undefined,
      addedAt: new Date().toISOString(),
    };

    const nextRoadmap: RoadmapContent = {
      ...viewRoadmap,
      intelligence: {
        ...viewRoadmap.intelligence,
        portfolioEvidence: upsertPortfolioEvidence(viewRoadmap, evidence),
        readiness: computeReadiness({
          ...viewRoadmap,
          intelligence: {
            ...viewRoadmap.intelligence,
            portfolioEvidence: upsertPortfolioEvidence(viewRoadmap, evidence),
          },
        }),
      },
    };

    setEvidenceTitle("");
    setEvidenceRepoUrl("");
    setEvidenceDemoUrl("");
    setEvidenceNote("");
    await applyRoadmapUpdate(nextRoadmap, "Portfolio evidence saved");
  };

  const handleAddApplication = async () => {
    if (!applicationCompany.trim() || !applicationRole.trim()) {
      setError("Add company and role to track an application");
      return;
    }

    const application: CareerApplication = {
      id: createId("application"),
      company: applicationCompany.trim(),
      role: applicationRole.trim(),
      status: applicationStatus,
      source: applicationSource.trim() || undefined,
      note: applicationNote.trim() || undefined,
      appliedAt: new Date().toISOString(),
    };

    const nextApplications = [...(viewRoadmap.intelligence?.applications ?? []), application].sort((left, right) =>
      right.appliedAt.localeCompare(left.appliedAt),
    );

    const nextRoadmap: RoadmapContent = {
      ...viewRoadmap,
      intelligence: {
        ...viewRoadmap.intelligence,
        applications: nextApplications,
      },
    };

    setApplicationCompany("");
    setApplicationRole("");
    setApplicationSource("");
    setApplicationNote("");
    setApplicationStatus("saved");
    await applyRoadmapUpdate(nextRoadmap, "Application tracker updated");
  };

  const handleAddMentorMemory = async () => {
    if (!mentorText.trim()) {
      setError("Write a mentor memory note first");
      return;
    }

    const entry: MentorMemoryEntry = {
      id: createId("mentor-memory"),
      kind: mentorKind,
      text: mentorText.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextRoadmap: RoadmapContent = {
      ...viewRoadmap,
      intelligence: {
        ...viewRoadmap.intelligence,
        mentorMemory: upsertMentorMemory(viewRoadmap, entry),
      },
    };

    setMentorText("");
    setMentorKind("insight");
    await applyRoadmapUpdate(nextRoadmap, "Mentor memory saved");
  };

  const handleAskMentor = async () => {
    if (!mentorPrompt.trim()) {
      setError("Ask a clear question for the mentor");
      return;
    }

    const reply = generateMentorReply(viewRoadmap, mentorPrompt.trim());
    const nextRoadmap: RoadmapContent = {
      ...viewRoadmap,
      intelligence: {
        ...viewRoadmap.intelligence,
        mentorReplies: upsertMentorReply(viewRoadmap, reply),
      },
    };

    setMentorPrompt("");
    await applyRoadmapUpdate(nextRoadmap, "Mentor reply generated");
  };

  const handleGenerateMockInterview = async () => {
    const stage = viewRoadmap.stages.find((item) => item.id === interviewStageId);
    if (!stage) {
      setError("Select a stage before generating a mock interview");
      return;
    }

    const session = generateMockInterviewSession(viewRoadmap, stage);
    setActiveInterview(session);
    setInterviewAnswers({});
    setInterviewFeedback(null);
    setMessage(`Mock interview created for ${stage.name}`);
  };

  const handleSubmitMockInterview = async () => {
    if (!activeInterview) {
      setError("Generate a mock interview first");
      return;
    }

    const sessionWithAnswers: MockInterviewSession = {
      ...activeInterview,
      answers: interviewAnswers,
    };

    const scoredSession: MockInterviewSession = {
      ...sessionWithAnswers,
      score: scoreMockInterview(sessionWithAnswers),
      completedAt: new Date().toISOString(),
    };

    const nextRoadmap: RoadmapContent = {
      ...viewRoadmap,
      intelligence: {
        ...viewRoadmap.intelligence,
        mockInterviews: upsertMockInterviewSession(viewRoadmap, scoredSession),
      },
    };

    setInterviewFeedback(`Mock interview scored ${scoredSession.score}%`);
    await applyRoadmapUpdate(nextRoadmap, "Mock interview saved");
  };

  const handleGenerateDailyPlan = async () => {
    const plan = generateDailyPlan(viewRoadmap);
    setDailyPlan(plan);

    const nextRoadmap: RoadmapContent = {
      ...viewRoadmap,
      intelligence: {
        ...viewRoadmap.intelligence,
        dailyPlan: upsertDailyPlan(viewRoadmap, plan),
      },
    };

    await applyRoadmapUpdate(nextRoadmap, "Daily planner generated");
  };

  const handleToggleDailyTask = async (taskId: string) => {
    if (!dailyPlan) return;

    const nextPlan: DailyPlan = {
      ...dailyPlan,
      tasks: dailyPlan.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    };

    setDailyPlan(nextPlan);
    await applyRoadmapUpdate(
      {
        ...viewRoadmap,
        intelligence: {
          ...viewRoadmap.intelligence,
          dailyPlan: nextPlan,
        },
      },
      "Daily task updated",
    );
  };

  const handlePostCommunityMessage = async () => {
    if (!communityMessage.trim()) {
      setError("Write a community post first");
      return;
    }

    const post = generateCommunityPost(communityAuthor.trim() || "You", communityTopic.trim() || "career accountability", communityMessage.trim());
    const nextRoadmap: RoadmapContent = {
      ...viewRoadmap,
      intelligence: {
        ...viewRoadmap.intelligence,
        communityPosts: upsertCommunityPost(viewRoadmap, post),
      },
    };

    setCommunityMessage("");
    await applyRoadmapUpdate(nextRoadmap, "Community post added");
  };

  const handleAddConnection = async () => {
    if (!connectionName.trim() || !connectionRole.trim()) {
      setError("Add a name and role to create a connection");
      return;
    }

    const nextRoadmap: RoadmapContent = {
      ...viewRoadmap,
      intelligence: {
        ...viewRoadmap.intelligence,
        networkConnections: upsertConnection(viewRoadmap, connectionName.trim(), connectionRole.trim()),
      },
    };

    setConnectionName("");
    setConnectionRole("");
    await applyRoadmapUpdate(nextRoadmap, "Network connection added");
  };

  const handleLikeCommunityPost = async (postId: string) => {
    const nextRoadmap: RoadmapContent = {
      ...viewRoadmap,
      intelligence: {
        ...viewRoadmap.intelligence,
        communityPosts: (viewRoadmap.intelligence?.communityPosts ?? []).map((post) =>
          post.id === postId ? { ...post, likes: post.likes + 1 } : post,
        ),
      },
    };

    await applyRoadmapUpdate(nextRoadmap, "Post liked");
  };

  return (
    <Box className="inner-ui" sx={{ color: "#e7edff" }}>
      <Card
        sx={{
          mb: 3,
          border: "1px solid rgba(120, 170, 255, 0.25)",
          borderRadius: 3,
          background:
            "radial-gradient(circle at 15% 20%, rgba(95, 157, 255, 0.28), transparent 48%), radial-gradient(circle at 85% 85%, rgba(79, 217, 186, 0.22), transparent 45%), linear-gradient(135deg, rgba(11, 24, 58, 0.92), rgba(17, 34, 79, 0.9))",
          boxShadow: "0 14px 35px rgba(8, 18, 49, 0.4)",
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
          <Stack spacing={1.2}>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "0.02em", color: "#f3f7ff" }}>
              {viewRoadmap.title}
            </Typography>
            <Typography sx={{ color: "rgba(225, 236, 255, 0.86)" }}>
              {canPersist ? "Auto-save is on. Your progress is being tracked live." : "Sign in to unlock auto-save and history for this roadmap."}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ pt: 1 }}>
              <Chip
                label={`${completedStages}/${totalStages} stages completed`}
                sx={{ bgcolor: "rgba(78, 221, 186, 0.2)", color: "#d8fff2", fontWeight: 700 }}
              />
              <Chip
                label={`${viewRoadmap.stages.reduce((sum, stage) => sum + stage.skills.length, 0)} skills mapped`}
                sx={{ bgcolor: "rgba(116, 159, 255, 0.2)", color: "#dbe6ff", fontWeight: 700 }}
              />
            </Stack>
            <Box sx={{ pt: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.7 }}>
                <Typography variant="body2" sx={{ color: "rgba(219, 231, 255, 0.9)" }}>
                  Progress
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(219, 231, 255, 0.9)" }}>
                  {Math.round(completionPercent)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={clampPercent(completionPercent)}
                sx={{
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #5ed4ff, #49e0b6)",
                  },
                }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 2, mb: 2.5 }}>
        <Card
          sx={{
            borderRadius: 2.5,
            border: "1px solid rgba(124, 162, 255, 0.25)",
            bgcolor: "rgba(15, 28, 63, 0.82)",
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ color: "#f4f8ff", fontWeight: 800, mb: 1 }}>
              Readiness Score
            </Typography>
            <Typography sx={{ color: "#dce8ff", mb: 1.4 }}>
              Overall: {readiness.score}%
            </Typography>
            <Stack spacing={1}>
              {[
                { label: "Skill", value: readiness.skillReadiness },
                { label: "Portfolio", value: readiness.portfolioReadiness },
                { label: "Interview", value: readiness.interviewReadiness },
                { label: "Consistency", value: readiness.consistencyReadiness },
              ].map((metric) => (
                <Box key={metric.label}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.3 }}>
                    <Typography variant="caption" sx={{ color: "rgba(210, 224, 255, 0.9)" }}>
                      {metric.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(210, 224, 255, 0.9)" }}>
                      {metric.value}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={clampPercent(metric.value)}
                    sx={{
                      height: 7,
                      borderRadius: 999,
                      backgroundColor: "rgba(255, 255, 255, 0.12)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 999,
                        background: "linear-gradient(90deg, #7bb6ff, #58dfc2)",
                      },
                    }}
                  />
                </Box>
              ))}
            </Stack>
            <Button
              variant="contained"
              size="small"
              onClick={handleWeeklyReplan}
              disabled={replanLoading}
              sx={{ mt: 1.6, textTransform: "none", fontWeight: 700 }}
            >
              {replanLoading ? "Replanning..." : "Auto Replan This Week"}
            </Button>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: 2.5,
            border: "1px solid rgba(124, 162, 255, 0.25)",
            bgcolor: "rgba(15, 28, 63, 0.82)",
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ color: "#f4f8ff", fontWeight: 800, mb: 1 }}>
              Job Gap Analyzer
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(220, 233, 255, 0.85)", mb: 1.2 }}>
              Paste a job description and compare your roadmap against market demand.
            </Typography>
            <TextField
              value={jobPostingText}
              onChange={(event) => setJobPostingText(event.target.value)}
              multiline
              minRows={4}
              fullWidth
              placeholder="Paste target job description here"
              sx={{
                "& .MuiInputBase-root": { color: "#e9f2ff", bgcolor: "rgba(11, 21, 48, 0.86)" },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(136, 170, 255, 0.32)" },
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleAnalyzeGap}
              disabled={gapLoading}
              sx={{ mt: 1.4, textTransform: "none", fontWeight: 700 }}
            >
              {gapLoading ? "Analyzing..." : "Analyze Job Gap"}
            </Button>

            {viewRoadmap.intelligence?.jobGap && (
              <Box sx={{ mt: 1.6 }}>
                <Typography sx={{ color: "#dce9ff", mb: 0.6 }}>
                  Match Score: {viewRoadmap.intelligence.jobGap.matchScore}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={clampPercent(viewRoadmap.intelligence.jobGap.matchScore)}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    mb: 1,
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      background: "linear-gradient(90deg, #6ea8ff, #45d7bd)",
                    },
                  }}
                />
                <Stack direction="row" spacing={0.8} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {viewRoadmap.intelligence.jobGap.missingSkills.slice(0, 8).map((skill) => (
                    <Chip
                      key={skill}
                      label={`Missing: ${skill}`}
                      size="small"
                      sx={{ bgcolor: "rgba(255, 116, 124, 0.2)", color: "#ffdfe3" }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: 2.5,
            border: "1px solid rgba(124, 162, 255, 0.25)",
            bgcolor: "rgba(15, 28, 63, 0.82)",
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ color: "#f4f8ff", fontWeight: 800, mb: 1 }}>
              Resume Bullets
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(220, 233, 255, 0.85)", mb: 1.2 }}>
              Convert completed stages into ATS-friendly bullet points.
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={handleGenerateBullets}
              disabled={bulletLoading}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {bulletLoading ? "Generating..." : "Generate Bullets"}
            </Button>

            {!!viewRoadmap.intelligence?.resumeBullets?.length && (
              <List sx={{ mt: 1.2, p: 0 }}>
                {viewRoadmap.intelligence.resumeBullets.slice(0, 4).map((bullet, index) => (
                  <ListItem key={`${bullet.stageId}-${index}`} sx={{ px: 0, py: 0.5 }}>
                    <ListItemText
                      primaryTypographyProps={{ sx: { color: "#dce8ff", fontSize: "0.9rem" } }}
                      primary={`- ${bullet.bullet}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Box>

      {viewRoadmap.studyPlan && (
        <Card
          sx={{
            mb: 2.5,
            borderRadius: 2.5,
            border: "1px solid rgba(124, 162, 255, 0.25)",
            bgcolor: "rgba(15, 28, 63, 0.82)",
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ color: "#f4f8ff", fontWeight: 800, mb: 1 }}>
              Weekly Action Plan
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(220, 233, 255, 0.85)", mb: 1.2 }}>
              {viewRoadmap.studyPlan.hoursPerWeek} hrs/week • {viewRoadmap.studyPlan.totalWeeks} total weeks
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 1.2 }}>
              {viewRoadmap.studyPlan.weeks.slice(0, 4).map((week) => (
                <Box
                  key={week.week}
                  sx={{
                    p: 1.2,
                    borderRadius: 1.8,
                    border: "1px solid rgba(140, 175, 255, 0.22)",
                    bgcolor: "rgba(9, 20, 44, 0.72)",
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: "#ebf3ff", fontSize: "0.9rem" }}>
                    Week {week.week}
                  </Typography>
                  <Typography sx={{ color: "#d6e5ff", fontSize: "0.84rem", mt: 0.3 }}>{week.focus}</Typography>
                  <Typography sx={{ color: "#c0d5ff", fontSize: "0.79rem", mt: 0.5 }}>
                    {week.tasks[0]}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 2, mb: 2.5 }}>
        <Card sx={{ borderRadius: 2.5, border: "1px solid rgba(124, 162, 255, 0.25)", bgcolor: "rgba(15, 28, 63, 0.82)" }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: "#f4f8ff", fontWeight: 800, mb: 1 }}>
              Interactive Quiz Lab
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(220, 233, 255, 0.85)", mb: 1.2 }}>
              Generate stage-specific quizzes, answer them, and keep a score history.
            </Typography>

            <TextField
              select
              fullWidth
              size="small"
              label="Quiz stage"
              value={selectedQuizStageId}
              onChange={(event) => setSelectedQuizStageId(Number(event.target.value))}
              sx={{ mb: 1.2 }}
            >
              {viewRoadmap.stages.map((stage) => (
                <MenuItem key={stage.id} value={stage.id}>
                  {stage.name}
                </MenuItem>
              ))}
            </TextField>

            <Button variant="contained" size="small" onClick={handleGenerateQuiz} disabled={quizLoading} sx={{ textTransform: "none", fontWeight: 700 }}>
              {quizLoading ? "Generating..." : "Generate Quiz"}
            </Button>

            {!!quizQuestions.length && (
              <Stack spacing={1.2} sx={{ mt: 1.5 }}>
                {quizQuestions.map((question) => (
                  <Card key={question.id} sx={{ bgcolor: "rgba(9, 20, 44, 0.72)", border: "1px solid rgba(140, 175, 255, 0.18)" }}>
                    <CardContent sx={{ p: 1.4 }}>
                      <Typography sx={{ color: "#edf4ff", fontWeight: 700, mb: 0.9, fontSize: "0.92rem" }}>
                        {question.question}
                      </Typography>
                      <Stack spacing={0.7}>
                        {question.options.map((option, index) => {
                          const isSelected = quizAnswers[question.id] === index;
                          return (
                            <Button
                              key={option}
                              variant={isSelected ? "contained" : "outlined"}
                              onClick={() => setQuizAnswers((previous) => ({ ...previous, [question.id]: index }))}
                              sx={{
                                justifyContent: "flex-start",
                                textTransform: "none",
                                color: isSelected ? "#05131f" : "#dce8ff",
                                borderColor: "rgba(140, 175, 255, 0.24)",
                                bgcolor: isSelected ? "#89ffd7" : "transparent",
                              }}
                            >
                              {option}
                            </Button>
                          );
                        })}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}

                <Button variant="contained" color="success" onClick={handleSubmitQuiz} disabled={quizSubmitting} sx={{ textTransform: "none", fontWeight: 700 }}>
                  {quizSubmitting ? "Scoring..." : "Submit Quiz"}
                </Button>
              </Stack>
            )}

            {viewRoadmap.intelligence?.quizzes?.find((quiz) => quiz.stageId === selectedQuizStageId)?.attempts?.length ? (
              <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ color: "#dce9ff", fontWeight: 700, mb: 0.6 }}>Score history</Typography>
                <Stack spacing={0.75}>
                  {viewRoadmap.intelligence?.quizzes
                    ?.find((quiz) => quiz.stageId === selectedQuizStageId)
                    ?.attempts?.slice(-3)
                    .reverse()
                    .map((attempt) => (
                      <Box key={attempt.takenAt} sx={{ p: 1, borderRadius: 1.5, bgcolor: "rgba(9, 20, 44, 0.72)" }}>
                        <Typography sx={{ color: "#eaf3ff", fontSize: "0.88rem", fontWeight: 700 }}>
                          {attempt.score}% score
                        </Typography>
                        <Typography sx={{ color: "#b8c9ef", fontSize: "0.79rem" }}>
                          {attempt.total} questions • {new Date(attempt.takenAt).toLocaleString()}
                        </Typography>
                      </Box>
                    ))}
                </Stack>
              </Box>
            ) : null}
          </CardContent>
        </Card>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 2, mb: 2.5 }}>
        <Card sx={{ borderRadius: 2.5, border: "1px solid rgba(124, 162, 255, 0.25)", bgcolor: "rgba(15, 28, 63, 0.82)" }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: "#f4f8ff", fontWeight: 800, mb: 0.8 }}>
              AI Mentor Memory
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(220, 233, 255, 0.85)", mb: 1.2 }}>
              Save long-term goals, blockers, and mentor notes. Ask the mentor and keep the answers in history.
            </Typography>

            <TextField
              select
              fullWidth
              size="small"
              label="Memory type"
              value={mentorKind}
              onChange={(event) => setMentorKind(event.target.value as MentorMemoryEntry["kind"])}
              sx={{ mb: 1.1 }}
            >
              <MenuItem value="goal">Goal</MenuItem>
              <MenuItem value="preference">Preference</MenuItem>
              <MenuItem value="blocker">Blocker</MenuItem>
              <MenuItem value="insight">Insight</MenuItem>
              <MenuItem value="reminder">Reminder</MenuItem>
            </TextField>
            <TextField fullWidth size="small" multiline minRows={2} label="Memory note" value={mentorText} onChange={(event) => setMentorText(event.target.value)} sx={{ mb: 1.1 }} />
            <Button variant="contained" size="small" onClick={handleAddMentorMemory} sx={{ textTransform: "none", fontWeight: 700 }}>
              Save Memory
            </Button>

            <Divider sx={{ my: 1.4, borderColor: "rgba(173, 197, 255, 0.18)" }} />

            <TextField fullWidth size="small" multiline minRows={2} label="Ask the mentor" value={mentorPrompt} onChange={(event) => setMentorPrompt(event.target.value)} sx={{ mb: 1.1 }} />
            <Button variant="outlined" size="small" onClick={handleAskMentor} sx={{ textTransform: "none", fontWeight: 700, color: "#dce8ff", borderColor: "rgba(140, 175, 255, 0.35)" }}>
              Ask Mentor
            </Button>

            {!!viewRoadmap.intelligence?.mentorReplies?.length && (
              <Stack spacing={1} sx={{ mt: 1.4 }}>
                {viewRoadmap.intelligence.mentorReplies.slice(-2).reverse().map((reply) => (
                  <Box key={reply.id} sx={{ p: 1.1, borderRadius: 1.5, bgcolor: "rgba(9, 20, 44, 0.72)" }}>
                    <Typography sx={{ color: "#edf4ff", fontWeight: 700, fontSize: "0.88rem" }}>{reply.prompt}</Typography>
                    <Typography sx={{ color: "#c7d7f7", fontSize: "0.82rem", mt: 0.5 }}>{reply.response}</Typography>
                  </Box>
                ))}
              </Stack>
            )}

            {!!viewRoadmap.intelligence?.mentorMemory?.length && (
              <List dense sx={{ mt: 1.1, p: 0 }}>
                {viewRoadmap.intelligence.mentorMemory.slice(-3).reverse().map((entry) => (
                  <ListItem key={entry.id} sx={{ px: 0, py: 0.25 }}>
                    <ListItemText
                      primaryTypographyProps={{ sx: { color: "#eaf3ff", fontSize: "0.88rem" } }}
                      secondaryTypographyProps={{ sx: { color: "#aebede", fontSize: "0.76rem" } }}
                      primary={entry.text}
                      secondary={entry.kind}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 2.5, border: "1px solid rgba(124, 162, 255, 0.25)", bgcolor: "rgba(15, 28, 63, 0.82)" }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: "#f4f8ff", fontWeight: 800, mb: 0.8 }}>
              Mock Interview Studio
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(220, 233, 255, 0.85)", mb: 1.2 }}>
              Generate interview questions from your roadmap and score your answers after practice.
            </Typography>

            <TextField select fullWidth size="small" label="Stage" value={interviewStageId} onChange={(event) => setInterviewStageId(Number(event.target.value))} sx={{ mb: 1.1 }}>
              {viewRoadmap.stages.map((stage) => (
                <MenuItem key={stage.id} value={stage.id}>
                  {stage.name}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" size="small" onClick={handleGenerateMockInterview} sx={{ textTransform: "none", fontWeight: 700 }}>
              Generate Mock Interview
            </Button>

            {activeInterview && (
              <Stack spacing={1.2} sx={{ mt: 1.5 }}>
                {activeInterview.questions.map((question) => (
                  <Box key={question.id} sx={{ p: 1.1, borderRadius: 1.5, bgcolor: "rgba(9, 20, 44, 0.72)" }}>
                    <Typography sx={{ color: "#edf4ff", fontWeight: 700, fontSize: "0.88rem" }}>{question.prompt}</Typography>
                    <Typography sx={{ color: "#aebede", fontSize: "0.77rem", mt: 0.4 }}>
                      Hints: {question.hints.join(" • ")}
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      label="Your answer"
                      value={interviewAnswers[question.id] ?? ""}
                      onChange={(event) => setInterviewAnswers((previous) => ({ ...previous, [question.id]: event.target.value }))}
                      sx={{ mt: 1, "& .MuiInputBase-root": { color: "#e9f2ff", bgcolor: "rgba(11, 21, 48, 0.86)" } }}
                    />
                  </Box>
                ))}
                <Button variant="outlined" size="small" onClick={handleSubmitMockInterview} sx={{ textTransform: "none", fontWeight: 700, color: "#dce8ff", borderColor: "rgba(140, 175, 255, 0.35)" }}>
                  Submit Interview
                </Button>
              </Stack>
            )}

            {interviewFeedback && (
              <Alert severity="success" sx={{ mt: 1.4, bgcolor: "rgba(40, 117, 89, 0.22)", color: "#d8ffe9" }}>
                {interviewFeedback}
              </Alert>
            )}

            {!!viewRoadmap.intelligence?.mockInterviews?.length && (
              <Stack spacing={0.9} sx={{ mt: 1.4 }}>
                {viewRoadmap.intelligence.mockInterviews.slice(-3).reverse().map((session) => (
                  <Box key={session.id} sx={{ p: 1.1, borderRadius: 1.5, bgcolor: "rgba(9, 20, 44, 0.72)" }}>
                    <Typography sx={{ color: "#edf4ff", fontWeight: 700, fontSize: "0.88rem" }}>{session.title}</Typography>
                    <Typography sx={{ color: "#aebede", fontSize: "0.77rem", mt: 0.4 }}>
                      Score: {session.score ?? 0}% • {session.questions.length} questions
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 2.5, border: "1px solid rgba(124, 162, 255, 0.25)", bgcolor: "rgba(15, 28, 63, 0.82)" }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: "#f4f8ff", fontWeight: 800, mb: 0.8 }}>
              Daily Planner
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(220, 233, 255, 0.85)", mb: 1.2 }}>
              Build a small daily plan from the roadmap, then check off tasks as you finish them.
            </Typography>

            <Button variant="contained" size="small" onClick={handleGenerateDailyPlan} sx={{ textTransform: "none", fontWeight: 700 }}>
              Generate Today Plan
            </Button>

            {dailyPlan && (
              <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ color: "#edf4ff", fontWeight: 700, fontSize: "0.9rem" }}>{dailyPlan.focus}</Typography>
                <Typography sx={{ color: "#aebede", fontSize: "0.77rem", mb: 1 }}>
                  {dailyPlan.date} • {dailyPlan.notes}
                </Typography>
                <Stack spacing={0.9}>
                  {dailyPlan.tasks.map((task) => (
                    <FormControlLabel
                      key={task.id}
                      control={<Switch checked={task.completed} onChange={() => void handleToggleDailyTask(task.id)} color="success" />}
                      label={`${task.label} (${task.minutes} min)`}
                      sx={{
                        color: "#dce8ff",
                        m: 0,
                        alignItems: "flex-start",
                        ".MuiFormControlLabel-label": { fontSize: "0.86rem" },
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 2.5, border: "1px solid rgba(124, 162, 255, 0.25)", bgcolor: "rgba(15, 28, 63, 0.82)" }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: "#f4f8ff", fontWeight: 800, mb: 0.8 }}>
              Community Network
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(220, 233, 255, 0.85)", mb: 1.2 }}>
              Post accountability updates and track career connections in one place.
            </Typography>

            <TextField fullWidth size="small" label="Your name" value={communityAuthor} onChange={(event) => setCommunityAuthor(event.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Topic" value={communityTopic} onChange={(event) => setCommunityTopic(event.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" multiline minRows={2} label="Post message" value={communityMessage} onChange={(event) => setCommunityMessage(event.target.value)} sx={{ mb: 1.1 }} />
            <Button variant="contained" size="small" onClick={handlePostCommunityMessage} sx={{ textTransform: "none", fontWeight: 700 }}>
              Post Update
            </Button>

            <Divider sx={{ my: 1.4, borderColor: "rgba(173, 197, 255, 0.18)" }} />

            <Typography sx={{ color: "#edf4ff", fontWeight: 700, fontSize: "0.88rem", mb: 0.7 }}>
              Add connection
            </Typography>
            <TextField fullWidth size="small" label="Name" value={connectionName} onChange={(event) => setConnectionName(event.target.value)} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Role / Relation" value={connectionRole} onChange={(event) => setConnectionRole(event.target.value)} sx={{ mb: 1 }} />
            <Button variant="outlined" size="small" onClick={handleAddConnection} sx={{ textTransform: "none", fontWeight: 700, color: "#dce8ff", borderColor: "rgba(140, 175, 255, 0.35)" }}>
              Save Connection
            </Button>

            {!!viewRoadmap.intelligence?.networkConnections?.length && (
              <Stack spacing={0.9} sx={{ mt: 1.4 }}>
                {viewRoadmap.intelligence.networkConnections.slice(-3).reverse().map((connection) => (
                  <Box key={connection.id} sx={{ p: 1.1, borderRadius: 1.5, bgcolor: "rgba(9, 20, 44, 0.72)" }}>
                    <Typography sx={{ color: "#edf4ff", fontWeight: 700, fontSize: "0.88rem" }}>{connection.name}</Typography>
                    <Typography sx={{ color: "#aebede", fontSize: "0.77rem", mt: 0.4 }}>
                      {connection.role} • {connection.status}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}

            {!!viewRoadmap.intelligence?.communityPosts?.length && (
              <Stack spacing={0.9} sx={{ mt: 1.5 }}>
                {viewRoadmap.intelligence.communityPosts.slice(0, 3).map((post) => (
                  <Box key={post.id} sx={{ p: 1.1, borderRadius: 1.5, bgcolor: "rgba(9, 20, 44, 0.72)" }}>
                    <Typography sx={{ color: "#edf4ff", fontWeight: 700, fontSize: "0.88rem" }}>
                      {post.author} • {post.topic}
                    </Typography>
                    <Typography sx={{ color: "#c7d7f7", fontSize: "0.82rem", mt: 0.45 }}>{post.message}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                      <Chip label={`${post.likes} likes`} size="small" sx={{ bgcolor: "rgba(109, 153, 255, 0.17)", color: "#e4eeff" }} />
                      <Button size="small" onClick={() => void handleLikeCommunityPost(post.id)} sx={{ textTransform: "none", color: "#dce8ff" }}>
                        Like
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
        <Card sx={{ borderRadius: 2.5, border: "1px solid rgba(124, 162, 255, 0.25)", bgcolor: "rgba(15, 28, 63, 0.82)" }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: "#f4f8ff", fontWeight: 800, mb: 1 }}>
              Portfolio Evidence Tracker
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(220, 233, 255, 0.85)", mb: 1.2 }}>
              Save repo links, demo links, and notes for each stage so progress becomes proof of work.
            </Typography>

            <TextField select fullWidth size="small" label="Stage" value={evidenceStageId} onChange={(event) => setEvidenceStageId(Number(event.target.value))} sx={{ mb: 1.1 }}>
              {viewRoadmap.stages.map((stage) => (
                <MenuItem key={stage.id} value={stage.id}>
                  {stage.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField fullWidth size="small" label="Evidence title" value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} sx={{ mb: 1.1 }} />
            <TextField fullWidth size="small" label="GitHub repo URL" value={evidenceRepoUrl} onChange={(event) => setEvidenceRepoUrl(event.target.value)} sx={{ mb: 1.1 }} />
            <TextField fullWidth size="small" label="Demo URL" value={evidenceDemoUrl} onChange={(event) => setEvidenceDemoUrl(event.target.value)} sx={{ mb: 1.1 }} />
            <TextField fullWidth size="small" multiline minRows={2} label="Note" value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} sx={{ mb: 1.1 }} />

            <Button variant="contained" size="small" onClick={handleAddEvidence} sx={{ textTransform: "none", fontWeight: 700 }}>
              Save Evidence
            </Button>

            {!!viewRoadmap.intelligence?.portfolioEvidence?.length && (
              <Stack spacing={0.9} sx={{ mt: 1.5 }}>
                {viewRoadmap.intelligence.portfolioEvidence.slice(-3).reverse().map((evidence) => {
                  const stageName = viewRoadmap.stages.find((stage) => stage.id === evidence.stageId)?.name ?? `Stage ${evidence.stageId}`;
                  return (
                    <Box key={evidence.id} sx={{ p: 1.05, borderRadius: 1.5, bgcolor: "rgba(9, 20, 44, 0.72)" }}>
                      <Typography sx={{ color: "#edf4ff", fontWeight: 700, fontSize: "0.9rem" }}>{evidence.title}</Typography>
                      <Typography sx={{ color: "#b8c9ef", fontSize: "0.8rem" }}>{stageName}</Typography>
                      <Typography sx={{ color: "#dce8ff", fontSize: "0.78rem", mt: 0.4 }}>{evidence.note || "No note added"}</Typography>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 2.5, border: "1px solid rgba(124, 162, 255, 0.25)", bgcolor: "rgba(15, 28, 63, 0.82)" }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: "#f4f8ff", fontWeight: 800, mb: 1 }}>
              Application Tracker
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(220, 233, 255, 0.85)", mb: 1.2 }}>
              Keep a lightweight funnel of saved jobs, applications, interviews, and offers.
            </Typography>

            <TextField fullWidth size="small" label="Company" value={applicationCompany} onChange={(event) => setApplicationCompany(event.target.value)} sx={{ mb: 1.1 }} />
            <TextField fullWidth size="small" label="Role" value={applicationRole} onChange={(event) => setApplicationRole(event.target.value)} sx={{ mb: 1.1 }} />
            <TextField select fullWidth size="small" label="Status" value={applicationStatus} onChange={(event) => setApplicationStatus(event.target.value as CareerApplicationStatus)} sx={{ mb: 1.1 }}>
              <MenuItem value="saved">Saved</MenuItem>
              <MenuItem value="applied">Applied</MenuItem>
              <MenuItem value="interview">Interview</MenuItem>
              <MenuItem value="offer">Offer</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </TextField>
            <TextField fullWidth size="small" label="Source / Job board" value={applicationSource} onChange={(event) => setApplicationSource(event.target.value)} sx={{ mb: 1.1 }} />
            <TextField fullWidth size="small" multiline minRows={2} label="Note" value={applicationNote} onChange={(event) => setApplicationNote(event.target.value)} sx={{ mb: 1.1 }} />

            <Button variant="contained" size="small" onClick={handleAddApplication} sx={{ textTransform: "none", fontWeight: 700 }}>
              Track Application
            </Button>

            {!!viewRoadmap.intelligence?.applications?.length && (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {(["saved", "applied", "interview", "offer", "rejected"] as CareerApplicationStatus[]).map((status) => {
                  const count = viewRoadmap.intelligence?.applications?.filter((item) => item.status === status).length ?? 0;
                  return (
                    <Chip key={status} label={`${status}: ${count}`} size="small" sx={{ bgcolor: "rgba(109, 153, 255, 0.17)", color: "#e4eeff" }} />
                  );
                })}

                {viewRoadmap.intelligence.applications.slice(-3).reverse().map((application) => (
                  <Box key={application.id} sx={{ p: 1.05, borderRadius: 1.5, bgcolor: "rgba(9, 20, 44, 0.72)" }}>
                    <Typography sx={{ color: "#edf4ff", fontWeight: 700, fontSize: "0.9rem" }}>{application.company}</Typography>
                    <Typography sx={{ color: "#b8c9ef", fontSize: "0.8rem" }}>{application.role}</Typography>
                    <Typography sx={{ color: "#dce8ff", fontSize: "0.78rem", mt: 0.4 }}>
                      {application.status.toUpperCase()} • {new Date(application.appliedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

      {message && (
        <Alert severity="success" sx={{ mb: 2, bgcolor: "rgba(40, 117, 89, 0.22)", color: "#d8ffe9" }}>
          {message}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: "rgba(140, 43, 55, 0.26)", color: "#ffe2e6" }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 2 }}>
        {viewRoadmap.stages.map((stage) => {
          const isDone = progressMap[stage.id] ?? false;
          const skillBarWidth = clampPercent((stage.skills.length / maxSkills) * 100);
          const resourceBarWidth = clampPercent((stage.resources.length / maxResources) * 100);

          return (
            <Card
              key={stage.id}
              sx={{
                borderRadius: 2.5,
                border: isDone ? "1px solid rgba(73, 224, 182, 0.5)" : "1px solid rgba(117, 158, 255, 0.25)",
                bgcolor: "rgba(15, 28, 63, 0.82)",
                boxShadow: isDone
                  ? "0 10px 26px rgba(65, 203, 166, 0.18)"
                  : "0 10px 24px rgba(7, 16, 42, 0.32)",
              }}
            >
              <CardContent sx={{ p: 2.2 }}>
                <Stack spacing={1.4}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Chip
                      label={`Stage ${stage.id}`}
                      size="small"
                      sx={{
                        bgcolor: isDone ? "rgba(73, 224, 182, 0.22)" : "rgba(116, 158, 255, 0.2)",
                        color: "#e9f4ff",
                        fontWeight: 700,
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "rgba(205, 219, 250, 0.9)" }}>
                      {stage.duration}
                    </Typography>
                  </Stack>

                  <Typography variant="h6" sx={{ color: "#f4f8ff", fontWeight: 800 }}>
                    {stage.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(219, 232, 255, 0.84)", minHeight: 44 }}>
                    {stage.description}
                  </Typography>

                  <Divider sx={{ borderColor: "rgba(173, 197, 255, 0.18)" }} />

                  <Box>
                    <Typography variant="caption" sx={{ color: "#cde0ff", fontWeight: 700 }}>
                      Stage Graph
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 0.7 }}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
                          <Typography variant="caption" sx={{ color: "rgba(205, 220, 255, 0.85)" }}>
                            Skills
                          </Typography>
                          <Typography variant="caption" sx={{ color: "rgba(205, 220, 255, 0.85)" }}>
                            {stage.skills.length}
                          </Typography>
                        </Stack>
                        <Box sx={{ height: 8, borderRadius: 99, bgcolor: "rgba(255, 255, 255, 0.12)" }}>
                          <Box
                            sx={{
                              height: "100%",
                              width: `${skillBarWidth}%`,
                              borderRadius: 99,
                              background: "linear-gradient(90deg, #6ca9ff, #74beff)",
                            }}
                          />
                        </Box>
                      </Box>

                      <Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
                          <Typography variant="caption" sx={{ color: "rgba(205, 220, 255, 0.85)" }}>
                            Resources
                          </Typography>
                          <Typography variant="caption" sx={{ color: "rgba(205, 220, 255, 0.85)" }}>
                            {stage.resources.length}
                          </Typography>
                        </Stack>
                        <Box sx={{ height: 8, borderRadius: 99, bgcolor: "rgba(255, 255, 255, 0.12)" }}>
                          <Box
                            sx={{
                              height: "100%",
                              width: `${resourceBarWidth}%`,
                              borderRadius: 99,
                              background: "linear-gradient(90deg, #59dcc8, #7eecbd)",
                            }}
                          />
                        </Box>
                      </Box>
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={0.8} useFlexGap sx={{ flexWrap: "wrap", pt: 0.4 }}>
                    {stage.skills.slice(0, 5).map((skill, index) => (
                      <Chip
                        key={`${stage.id}-skill-${index}`}
                        label={skill}
                        size="small"
                        sx={{ bgcolor: "rgba(109, 153, 255, 0.17)", color: "#e4eeff" }}
                      />
                    ))}
                  </Stack>

                  <FormControlLabel
                    control={
                      <Switch checked={isDone} onChange={() => handleToggleStage(stage.id)} color="success" />
                    }
                    label={isDone ? "Completed" : "Mark as completed"}
                    sx={{
                      m: 0,
                      pt: 0.6,
                      color: "#deebff",
                      ".MuiFormControlLabel-label": { fontSize: "0.92rem", fontWeight: 600 },
                    }}
                  />
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
