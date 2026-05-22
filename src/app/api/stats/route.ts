import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const [
            users, orgs, flights,
            occurrences, highRisk, pendingTriage,
            openL1, openL2, overdueFindings,
            totalAudits, openAmendments,
            totalManuals, outdatedManuals,
            memories,
        ] = await Promise.all([
            prisma.user.count().catch(() => 0),
            prisma.organisation.count().catch(() => 0),
            prisma.flight.count().catch(() => 0),
            prisma.mod1_occurrences.count().catch(() => 0),
            prisma.mod1_occurrences.count({ where: { riskLevel: { in: ["HIGH", "CRITICAL", "UNACCEPTABLE"] } } }).catch(() => 0),
            prisma.mod1_occurrences.count({ where: { status: "Pending_Triage" } }).catch(() => 0),
            prisma.sqms_Finding.count({ where: { state: { not: "CLOSED" }, severity: "LEVEL1" } }).catch(() => 0),
            prisma.sqms_Finding.count({ where: { state: { not: "CLOSED" }, severity: "LEVEL2" } }).catch(() => 0),
            prisma.sqms_Finding.count({ where: { state: { not: "CLOSED" }, dueClosure: { lt: new Date() } } }).catch(() => 0),
            prisma.sqms_Audit.count().catch(() => 0),
            prisma.mod9_10_amendments.count({ where: { status: { in: ["Draft_Editing", "Quarantine_Awaiting_LBA"] } } }).catch(() => 0),
            prisma.doc_manuals.count().catch(() => 0),
            prisma.doc_manuals.count({ where: { compliance_status: { not: "UP_TO_DATE" } } }).catch(() => 0),
            prisma.sys_brain_memory.count().catch(() => 0),
        ]);

        // Overall platform health score
        const healthScore = Math.max(0, Math.min(100,
            100 - (openL1 * 15) - (openL2 * 5) - (overdueFindings * 3) - (highRisk * 8) - (pendingTriage * 2) - (outdatedManuals * 2)
        ));

        return NextResponse.json({
            platform: { users, orgs, flights, healthScore },
            safety: { occurrences, highRisk, pendingTriage },
            audit: { openL1, openL2, overdueFindings, totalAudits },
            manuals: { totalManuals, outdatedManuals, openAmendments },
            brain: { memories },
        });
    } catch (e) {
        console.error("Stats error:", e);
        return NextResponse.json({
            platform: { users: 0, orgs: 0, flights: 0, healthScore: 0 },
            safety: { occurrences: 0, highRisk: 0, pendingTriage: 0 },
            audit: { openL1: 0, openL2: 0, overdueFindings: 0, totalAudits: 0 },
            manuals: { totalManuals: 0, outdatedManuals: 0, openAmendments: 0 },
            brain: { memories: 0 },
        });
    }
}
