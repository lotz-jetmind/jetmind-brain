import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type Alert = {
    id: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM";
    module: "safety" | "audit" | "manuals" | "fleet";
    title: string;
    description: string;
    count: number;
    href: string;
};

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const alerts: Alert[] = [];

    // 1) Open L1 Findings — CRITICAL
    const openL1Findings = await prisma.sqms_Finding
        .count({ where: { state: { not: "CLOSED" }, severity: "LEVEL1" } })
        .catch(() => 0);
    if (openL1Findings > 0) {
        alerts.push({
            id: "open-l1-findings",
            severity: "CRITICAL",
            module: "audit",
            title: `${openL1Findings} offene Level-1 Finding${openL1Findings > 1 ? "s" : ""}`,
            description: "Sofortige Maßnahmen erforderlich",
            count: openL1Findings,
            href: "/audit",
        });
    }

    // 2) High-risk active hazards — CRITICAL
    const highRiskOccurrences = await prisma.mod1_occurrences
        .count({
            where: {
                status: "Active_Hazard",
                riskLevel: { in: ["HIGH", "CRITICAL"] },
            },
        })
        .catch(() => 0);
    if (highRiskOccurrences > 0) {
        alerts.push({
            id: "high-risk-hazards",
            severity: "CRITICAL",
            module: "safety",
            title: `${highRiskOccurrences} aktives Hochrisiko-Hazard${highRiskOccurrences > 1 ? "s" : ""}`,
            description: "Risk Assessment & Mitigation ausstehend",
            count: highRiskOccurrences,
            href: "/safety",
        });
    }

    // 3) Overdue findings (> 3) — HIGH
    const overdueFindings = await prisma.sqms_Finding
        .count({ where: { state: { not: "CLOSED" }, dueClosure: { lt: now } } })
        .catch(() => 0);
    if (overdueFindings > 3) {
        alerts.push({
            id: "overdue-findings",
            severity: "HIGH",
            module: "audit",
            title: `${overdueFindings} überfällige Findings`,
            description: "Closure-Frist überschritten",
            count: overdueFindings,
            href: "/audit",
        });
    }

    // 4) Pending triage occurrences — HIGH
    const pendingTriage = await prisma.mod1_occurrences
        .count({ where: { status: "Pending_Triage" } })
        .catch(() => 0);
    if (pendingTriage > 0) {
        alerts.push({
            id: "pending-triage",
            severity: "HIGH",
            module: "safety",
            title: `${pendingTriage} Occurrence${pendingTriage > 1 ? "s" : ""} warten auf Triage`,
            description: "Safety Manager Eingreifen erforderlich",
            count: pendingTriage,
            href: "/safety",
        });
    }

    // 5) Outdated manuals — MEDIUM
    const outdatedManuals = await prisma.doc_manuals
        .count({ where: { compliance_status: { not: "UP_TO_DATE" } } })
        .catch(() => 0);
    if (outdatedManuals > 0) {
        alerts.push({
            id: "outdated-manuals",
            severity: "MEDIUM",
            module: "manuals",
            title: `${outdatedManuals} veraltete${outdatedManuals > 1 ? " Handbücher" : "s Handbuch"}`,
            description: "Compliance Status nicht UP_TO_DATE",
            count: outdatedManuals,
            href: "/manuals",
        });
    }

    return NextResponse.json(alerts);
}
