import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { listRoadmapsByUserId } from "@/lib/db";

function computeConversionRate(applications: Array<{ status?: string }>) {
  if (!applications || applications.length === 0) return 0;
  const applied = applications.length;
  const offers = applications.filter((a) => a.status === 'offer').length;
  return Math.round((offers / applied) * 10000) / 100; // percent with 2 decimals
}

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const roadmaps = await listRoadmapsByUserId(user.id);

    // aggregate
    const allApplications: Array<{ status?: string }> = [];
    const weeklyMap: Record<string, number> = {};
    const quizScores: Record<string, { sum: number; count: number }> = {};
    const readinessTrend: Record<string, { sum: number; count: number }> = {};

    for (const r of roadmaps) {
      const intel = r.content.intelligence || {};
      if (intel.applications) allApplications.push(...(intel.applications || []));

      // weekly consistency: use progress.updatedAt or studyPlan.generatedAt
      const updated = r.content.progress?.updatedAt || r.content.studyPlan?.generatedAt || r.created_at;
      const week = updated ? new Date(updated).toISOString().slice(0,10) : 'unknown';
      weeklyMap[week] = (weeklyMap[week] || 0) + 1;

      if (intel.quizzes) {
        for (const q of intel.quizzes) {
          const date = q.takenAt ? q.takenAt.slice(0,10) : r.created_at.slice(0,10);
          const entry = quizScores[date] || { sum: 0, count: 0 };
          if (typeof q.lastScore === 'number') { entry.sum += q.lastScore; entry.count += 1; }
          quizScores[date] = entry;
        }
      }

      if (intel.readiness) {
        const date = intel.readiness.generatedAt ? intel.readiness.generatedAt.slice(0,10) : r.created_at.slice(0,10);
        const entry = readinessTrend[date] || { sum: 0, count: 0 };
        entry.sum += intel.readiness.score || 0;
        entry.count += 1;
        readinessTrend[date] = entry;
      }
    }

    const analytics = {
      applicationConversionRate: computeConversionRate(allApplications),
      weeklyConsistency: Object.keys(weeklyMap).map((k) => ({ weekStart: k, actions: weeklyMap[k] })).sort((a,b)=>a.weekStart.localeCompare(b.weekStart)),
      quizScoreTrend: Object.keys(quizScores).map((k)=>({ date: k, averageScore: Math.round((quizScores[k].sum / Math.max(1, quizScores[k].count))*100)/100 })),
      skillReadinessTrend: Object.keys(readinessTrend).map((k)=>({ date: k, readinessScore: Math.round((readinessTrend[k].sum / Math.max(1, readinessTrend[k].count))*100)/100 })),
    };

    return NextResponse.json({ analytics }, { status: 200 });
  } catch (error) {
    console.error('Analytics failed', error);
    return NextResponse.json({ message: 'Failed to compute analytics' }, { status: 500 });
  }
}
