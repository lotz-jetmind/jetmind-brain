import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// ─── GET /api/briefing ────────────────────────────────────────────────────────
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Today at midnight UTC (for Date-only comparison)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // ── Check if briefing already exists for today ────────────────────────────
    const existing = await prisma.sys_brain_briefing.findUnique({
        where: {
            userId_briefing_date: {
                userId,
                briefing_date: today,
            },
        },
    }).catch(() => null);

    if (existing && existing.generated) {
        return NextResponse.json(existing);
    }

    // ── Collect live metrics ──────────────────────────────────────────────────
    const now = new Date();

    const [findings, occurrences, amendments] = await Promise.all([
        prisma.sqms_Finding.findMany({
            select: { severity: true, state: true, dueClosure: true },
            where: { state: { not: "CLOSED" } },
            take: 500,
        }).catch(() => []),
        prisma.mod1_occurrences.findMany({
            select: { status: true, riskLevel: true },
            take: 500,
        }).catch(() => []),
        prisma.mod9_10_amendments.findMany({
            select: { status: true },
            where: { status: { in: ["Draft_Editing", "Quarantine_Awaiting_LBA"] } },
            take: 100,
        }).catch(() => []),
    ]);

    // Compute metrics
    const openL1 = findings.filter(f => f.severity === "LEVEL1" || f.severity === "L1").length;
    const overdueFindings = findings.filter(f =>
        f.dueClosure && new Date(f.dueClosure) < now
    ).length;
    const pendingTriage = occurrences.filter(o => o.status === "Pending_Triage").length;
    const activeHazards = occurrences.filter(o => o.status === "Active_Hazard").length;
    const highRisk = occurrences.filter(o =>
        o.riskLevel && ["HIGH", "CRITICAL", "UNACCEPTABLE"].includes(o.riskLevel.toUpperCase())
    ).length;
    const pendingAmendments = amendments.length;

    // ── Generate with Gemini ──────────────────────────────────────────────────
    const prompt = `Du bist Jetmind Brain. Erstelle ein prägnantes Morning Briefing für den Safety/Compliance Manager.

Aktuelle Daten:
- Offene L1 Findings: ${openL1}
- Überfällige Findings: ${overdueFindings}
- Pending Triage Occurrences: ${pendingTriage}
- Active Hazards: ${activeHazards}
- High-Risk Occurrences: ${highRisk}
- Pending Amendments: ${pendingAmendments}

Erstelle 5 priorisierte Punkte im Format:
1. [PRIORITY] Was muss heute getan werden?
2. ...

Sei konkret, handlungsorientiert, unter 200 Wörter gesamt. Gib nur die 5 Punkte aus, keine Einleitung.`;

    let briefingItems: Array<{ priority: string; message: string; index: number }> = [];

    try {
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        });
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse numbered list
        const lines = text
            .split("\n")
            .map(l => l.trim())
            .filter(l => /^\d+\./.test(l));

        briefingItems = lines.map((line, idx) => {
            // Extract priority tag like [HIGH] or [KRITISCH]
            const priorityMatch = line.match(/\[([^\]]+)\]/);
            const priority = priorityMatch ? priorityMatch[1] : "INFO";
            const message = line
                .replace(/^\d+\.\s*/, "")
                .replace(/\[[^\]]+\]\s*/, "")
                .trim();
            return { priority, message, index: idx + 1 };
        });

        // Fallback: split by newlines if no numbered list detected
        if (briefingItems.length === 0) {
            briefingItems = text
                .split("\n")
                .filter(l => l.trim().length > 20)
                .slice(0, 5)
                .map((l, idx) => ({ priority: "INFO", message: l.trim(), index: idx + 1 }));
        }
    } catch (err) {
        console.error("Gemini briefing error:", err);
        // Graceful fallback
        briefingItems = [
            { priority: "HIGH", message: `${openL1} L1 Findings offen — sofortige Prüfung erforderlich.`, index: 1 },
            { priority: "HIGH", message: `${overdueFindings} Findings überfällig — Maßnahmen einleiten.`, index: 2 },
            { priority: "MEDIUM", message: `${pendingTriage} Occurrences warten auf Triage-Entscheidung.`, index: 3 },
            { priority: "MEDIUM", message: `${activeHazards} aktive Hazards in der Risikobewertung.`, index: 4 },
            { priority: "LOW", message: `${pendingAmendments} Amendments ausstehend — Amendment-Status prüfen.`, index: 5 },
        ];
    }

    // ── Save or update briefing ───────────────────────────────────────────────
    const briefing = await prisma.sys_brain_briefing.upsert({
        where: {
            userId_briefing_date: {
                userId,
                briefing_date: today,
            },
        },
        create: {
            userId,
            briefing_date: today,
            items: briefingItems,
            generated: true,
        },
        update: {
            items: briefingItems,
            generated: true,
        },
    }).catch(async () => {
        // Return an in-memory object if DB fails
        return {
            id: "temp",
            userId,
            briefing_date: today,
            items: briefingItems,
            generated: true,
            created_at: new Date(),
        };
    });

    return NextResponse.json({
        ...briefing,
        meta: {
            openL1,
            overdueFindings,
            pendingTriage,
            activeHazards,
            highRisk,
            pendingAmendments,
        },
    });
}
