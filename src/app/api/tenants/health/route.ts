import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type TenantHealth = {
    orgId: string;
    name: string;
    slug: string;
    users: number;
    findings: {
        total: number;
        openL1: number;
        openL2: number;
        overdue: number;
    };
    occurrences: {
        total: number;
        highRisk: number;
        pendingTriage: number;
    };
    manuals: {
        total: number;
        outdated: number;
    };
    healthScore: number;
    healthLabel: "HEALTHY" | "AT_RISK" | "CRITICAL";
};

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // 1) All orgs
        const orgs = await prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                slug: true,
                _count: { select: { users: true } },
            },
            orderBy: { createdAt: "asc" },
            take: 200,
        });

        const now = new Date();

        // 2) Findings grouped by org (open, not CLOSED)
        const openFindings = await prisma.sqms_Finding
            .groupBy({
                by: ["orgId"],
                _count: { id: true },
                where: { state: { not: "CLOSED" } },
            })
            .catch(() => [] as { orgId: string; _count: { id: number } }[]);

        const openL1Findings = await prisma.sqms_Finding
            .groupBy({
                by: ["orgId"],
                _count: { id: true },
                where: { state: { not: "CLOSED" }, severity: "LEVEL1" },
            })
            .catch(() => [] as { orgId: string; _count: { id: number } }[]);

        const openL2Findings = await prisma.sqms_Finding
            .groupBy({
                by: ["orgId"],
                _count: { id: true },
                where: { state: { not: "CLOSED" }, severity: "LEVEL2" },
            })
            .catch(() => [] as { orgId: string; _count: { id: number } }[]);

        const overdueFindings = await prisma.sqms_Finding
            .groupBy({
                by: ["orgId"],
                _count: { id: true },
                where: { state: { not: "CLOSED" }, dueClosure: { lt: now } },
            })
            .catch(() => [] as { orgId: string; _count: { id: number } }[]);

        // 3) Occurrences grouped by org
        const allOccurrences = await prisma.mod1_occurrences
            .groupBy({
                by: ["orgId"],
                _count: { id: true },
            })
            .catch(() => [] as { orgId: string; _count: { id: number } }[]);

        const highRiskOccurrences = await prisma.mod1_occurrences
            .groupBy({
                by: ["orgId"],
                _count: { id: true },
                where: {
                    status: "Active_Hazard",
                    riskLevel: { in: ["HIGH", "CRITICAL"] },
                },
            })
            .catch(() => [] as { orgId: string; _count: { id: number } }[]);

        const pendingTriageOccurrences = await prisma.mod1_occurrences
            .groupBy({
                by: ["orgId"],
                _count: { id: true },
                where: { status: "Pending_Triage" },
            })
            .catch(() => [] as { orgId: string; _count: { id: number } }[]);

        // 4) Manuals grouped by org
        const allManuals = await prisma.doc_manuals
            .groupBy({
                by: ["orgId"],
                _count: { id: true },
            })
            .catch(() => [] as { orgId: string; _count: { id: number } }[]);

        const outdatedManuals = await prisma.doc_manuals
            .groupBy({
                by: ["orgId"],
                _count: { id: true },
                where: { compliance_status: { not: "UP_TO_DATE" } },
            })
            .catch(() => [] as { orgId: string; _count: { id: number } }[]);

        // Helper lookups
        const lookup = (arr: { orgId: string; _count: { id: number } }[], id: string) =>
            arr.find(r => r.orgId === id)?._count.id ?? 0;

        // 5) Assemble results
        const results: TenantHealth[] = orgs.map((org: { id: string; name: string | null; slug: string; _count: { users: number } }) => {
            const openL1 = lookup(openL1Findings, org.id);
            const openL2 = lookup(openL2Findings, org.id);
            const overdue = lookup(overdueFindings, org.id);
            const highRisk = lookup(highRiskOccurrences, org.id);
            const outdated = lookup(outdatedManuals, org.id);

            const healthScore = Math.max(
                0,
                Math.min(
                    100,
                    100 -
                        openL1 * 20 -
                        openL2 * 8 -
                        overdue * 5 -
                        highRisk * 10 -
                        outdated * 3,
                ),
            );

            const healthLabel: "HEALTHY" | "AT_RISK" | "CRITICAL" =
                healthScore >= 80 ? "HEALTHY" : healthScore >= 60 ? "AT_RISK" : "CRITICAL";

            return {
                orgId: org.id,
                name: org.name ?? org.slug,
                slug: org.slug,
                users: org._count.users,
                findings: {
                    total: lookup(openFindings, org.id),
                    openL1,
                    openL2,
                    overdue,
                },
                occurrences: {
                    total: lookup(allOccurrences, org.id),
                    highRisk,
                    pendingTriage: lookup(pendingTriageOccurrences, org.id),
                },
                manuals: {
                    total: lookup(allManuals, org.id),
                    outdated,
                },
                healthScore,
                healthLabel,
            };
        });

        // Sort: worst health score first
        results.sort((a, b) => a.healthScore - b.healthScore);

        return NextResponse.json(results);
    } catch (e) {
        console.error("Tenant Health API error:", e);
        return NextResponse.json([], { status: 200 });
    }
}
