import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // ── Occurrences ──────────────────────────────────────────────────────
        const occurrences = await prisma.mod1_occurrences.findMany({
            select: {
                id: true, orgId: true, status: true, riskLevel: true, riskScore: true,
                flight_phase: true, easa_occurrence_type: true, ai_adrep_category: true,
                final_adrep_category: true, event_datetime_utc: true, createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 200,
        }).catch(() => []);

        // ── Risk Assessments ──────────────────────────────────────────────────
        const riskAssessments = await prisma.mod2_risk_assessments.findMany({
            select: { id: true, status: true, assessed_at_utc: true },
            take: 100,
        }).catch(() => []);

        // ── Open CAP Tasks ────────────────────────────────────────────────────
        const capTasks = await prisma.mod2_cap_tasks.findMany({
            select: { id: true, orgId: true, status: true, due_date_utc: true, task_description: true },
            where: { status: { not: "Closed" } },
            take: 100,
        }).catch(() => []);

        // ── Defects ───────────────────────────────────────────────────────────
        const defects = await prisma.defect.findMany({
            select: { id: true, orgId: true, status: true, category: true, ataChapter: true, date: true },
            orderBy: { date: "desc" },
            take: 200,
        }).catch(() => []);

        // ── Compute analytics ─────────────────────────────────────────────────
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

        // By status
        const byStatus = occurrences.reduce((acc: Record<string, number>, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1; return acc;
        }, {});

        // By risk level
        const byRisk = occurrences.reduce((acc: Record<string, number>, o) => {
            const k = o.riskLevel || "Unknown";
            acc[k] = (acc[k] || 0) + 1; return acc;
        }, {});

        // By flight phase
        const byPhase = occurrences.reduce((acc: Record<string, number>, o) => {
            const k = o.flight_phase || "Unknown";
            acc[k] = (acc[k] || 0) + 1; return acc;
        }, {});

        // By EASA category
        const byCategory = occurrences.reduce((acc: Record<string, number>, o) => {
            const k = o.final_adrep_category || o.ai_adrep_category || "Uncategorised";
            acc[k] = (acc[k] || 0) + 1; return acc;
        }, {});

        // Trend: last 7 vs previous 7 days
        const last7  = occurrences.filter(o => o.event_datetime_utc && new Date(o.event_datetime_utc) >= sevenDaysAgo).length;
        const prev7  = occurrences.filter(o => {
            const d = o.event_datetime_utc ? new Date(o.event_datetime_utc) : null;
            if (!d) return false;
            return d >= new Date(sevenDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && d < sevenDaysAgo;
        }).length;
        const trendPct = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;

        // Last 30 days occurrences
        const last30 = occurrences.filter(o => o.event_datetime_utc && new Date(o.event_datetime_utc) >= thirtyDaysAgo).length;

        // Overdue CAP tasks
        const overdueCap = capTasks.filter(t => new Date(t.due_date_utc) < now).length;

        // Open defects
        const openDefects = defects.filter(d => d.status === "OPEN").length;

        // High risk count (riskLevel = HIGH or CRITICAL or similar)
        const highRisk = occurrences.filter(o =>
            o.riskLevel && ["HIGH", "CRITICAL", "UNACCEPTABLE", "5", "4"].includes(o.riskLevel.toUpperCase())
        ).length;

        // Pending triage
        const pendingTriage = occurrences.filter(o => o.status === "Pending_Triage").length;

        // Active hazards
        const activeHazards = occurrences.filter(o => o.status === "Active_Hazard").length;

        // Timeline: occurrences per month (last 6 months)
        const timeline: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now);
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            timeline[key] = 0;
        }
        occurrences.forEach(o => {
            if (!o.event_datetime_utc) return;
            const d = new Date(o.event_datetime_utc);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (key in timeline) timeline[key]++;
        });

        // ATA chapter distribution (defects)
        const byAta = defects.reduce((acc: Record<string, number>, d) => {
            const k = d.ataChapter || "Unknown";
            acc[k] = (acc[k] || 0) + 1; return acc;
        }, {});
        const topAta = Object.entries(byAta).sort((a, b) => b[1] - a[1]).slice(0, 8);

        return NextResponse.json({
            summary: {
                total: occurrences.length,
                last30,
                last7,
                trendPct,
                highRisk,
                pendingTriage,
                activeHazards,
                openCapTasks: capTasks.length,
                overdueCap,
                openDefects,
                riskAssessments: riskAssessments.length,
            },
            charts: {
                byStatus:   Object.entries(byStatus).sort((a,b) => b[1]-a[1]).slice(0, 8),
                byRisk:     Object.entries(byRisk).sort((a,b) => b[1]-a[1]),
                byPhase:    Object.entries(byPhase).sort((a,b) => b[1]-a[1]).slice(0, 8),
                byCategory: Object.entries(byCategory).sort((a,b) => b[1]-a[1]).slice(0, 8),
                timeline:   Object.entries(timeline),
                topAta,
            },
        });
    } catch (e) {
        console.error("Safety API error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// Type declarations for Prisma models not auto-typed
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace PrismaJson {
        type mod2_cap_tasks = { id: string; orgId: string; status: string; due_date_utc: Date; task_description: string };
    }
}
