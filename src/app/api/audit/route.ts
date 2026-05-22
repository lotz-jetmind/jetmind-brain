import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    try {
        // ── Audits ────────────────────────────────────────────────────────────
        const audits = await prisma.sqms_Audit.findMany({
            select: {
                id: true, orgId: true, status: true, auditType: true,
                plannedDate: true, actualDate: true, closureDate: true,
                findingCountL1: true, findingCountL2: true, findingCountL3: true,
                findingCountObs: true, findingCounter: true,
                rbiScore: true, createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 200,
        }).catch(() => []);

        // ── Findings ──────────────────────────────────────────────────────────
        const findings = await prisma.sqms_Finding.findMany({
            select: {
                id: true, orgId: true, state: true, severity: true,
                dueContainment: true, dueCap: true, dueClosure: true,
                containmentAt: true, capAt: true, closedAt: true,
                safetyReviewStatus: true, createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 300,
        }).catch(() => []);

        // ── Analytics ─────────────────────────────────────────────────────────

        // Audit status distribution
        const auditByStatus = audits.reduce((acc: Record<string, number>, a) => {
            acc[a.status] = (acc[a.status] || 0) + 1; return acc;
        }, {});

        // Audit type distribution
        const auditByType = audits.reduce((acc: Record<string, number>, a) => {
            acc[a.auditType] = (acc[a.auditType] || 0) + 1; return acc;
        }, {});

        // Finding severity distribution
        const findingBySeverity = findings.reduce((acc: Record<string, number>, f) => {
            acc[f.severity] = (acc[f.severity] || 0) + 1; return acc;
        }, {});

        // Finding state distribution
        const findingByState = findings.reduce((acc: Record<string, number>, f) => {
            acc[f.state] = (acc[f.state] || 0) + 1; return acc;
        }, {});

        // Overdue findings (dueClosure in past, not closed)
        const overdueFindings = findings.filter(f =>
            f.state !== "CLOSED" && f.dueClosure && new Date(f.dueClosure) < now
        ).length;

        // Open L1 findings (critical)
        const openL1 = findings.filter(f => f.state !== "CLOSED" && f.severity === "LEVEL1").length;
        const openL2 = findings.filter(f => f.state !== "CLOSED" && f.severity === "LEVEL2").length;

        // Safety-linked findings
        const safetyLinked = findings.filter(f => f.safetyReviewStatus !== "NOT_REQUIRED").length;

        // Recent audit activity (last 30 days)
        const recentAudits = audits.filter(a => new Date(a.createdAt) >= thirtyDaysAgo).length;

        // Closed audits rate
        const closedAudits = audits.filter(a => a.status === "CLOSED").length;
        const closureRate = audits.length > 0 ? Math.round((closedAudits / audits.length) * 100) : 0;

        // Average findings per audit
        const avgFindings = audits.length > 0
            ? Math.round(audits.reduce((a, x) => a + (x.findingCounter || 0), 0) / audits.length * 10) / 10
            : 0;

        // Overdue audits (planned date in past, not closed)
        const overdueAudits = audits.filter(a =>
            a.status !== "CLOSED" && a.plannedDate && new Date(a.plannedDate) < now
        ).length;

        // Monthly audit trend (last 6 months)
        const auditTimeline: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now); d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            auditTimeline[key] = 0;
        }
        audits.forEach(a => {
            const d = new Date(a.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (key in auditTimeline) auditTimeline[key]++;
        });

        // Compliance score: rough calculation
        // Formula: 100 - (openL1 * 15) - (openL2 * 5) - (overdueFindings * 3)
        const complianceScore = Math.max(0, Math.min(100,
            100 - (openL1 * 15) - (openL2 * 5) - (overdueFindings * 3) - (overdueAudits * 2)
        ));

        // Recent findings without containment
        const pendingContainment = findings.filter(f =>
            f.state === "OPEN" && !f.containmentAt && f.dueContainment && new Date(f.dueContainment) < now
        ).length;

        // Per-org compliance (top-level)
        const orgAuditMap: Record<string, { audits: number; findings: number; open: number }> = {};
        audits.forEach(a => {
            if (!orgAuditMap[a.orgId]) orgAuditMap[a.orgId] = { audits: 0, findings: 0, open: 0 };
            orgAuditMap[a.orgId].audits++;
        });
        findings.forEach(f => {
            if (!orgAuditMap[f.orgId]) orgAuditMap[f.orgId] = { audits: 0, findings: 0, open: 0 };
            orgAuditMap[f.orgId].findings++;
            if (f.state !== "CLOSED") orgAuditMap[f.orgId].open++;
        });

        const topOrgs = Object.entries(orgAuditMap)
            .sort((a, b) => b[1].findings - a[1].findings)
            .slice(0, 8)
            .map(([orgId, stats]) => ({ orgId: orgId.slice(0, 8) + "…", ...stats }));

        return NextResponse.json({
            summary: {
                totalAudits: audits.length,
                recentAudits,
                closedAudits,
                closureRate,
                overdueAudits,
                avgFindings,
                totalFindings: findings.length,
                openL1,
                openL2,
                overdueFindings,
                pendingContainment,
                safetyLinked,
                complianceScore,
            },
            charts: {
                auditByStatus: Object.entries(auditByStatus).sort((a, b) => b[1] - a[1]),
                auditByType: Object.entries(auditByType).sort((a, b) => b[1] - a[1]),
                findingBySeverity: Object.entries(findingBySeverity).sort((a, b) => b[1] - a[1]),
                findingByState: Object.entries(findingByState).sort((a, b) => b[1] - a[1]),
                auditTimeline: Object.entries(auditTimeline),
                topOrgs,
            },
        });
    } catch (e) {
        console.error("Shadow Audit API error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
