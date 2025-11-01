import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const EXPECTED_CATEGORIES = [
  "modality",
  "consent",
  "in_person",
  "provider_eligibility",
  "site_eligibility",
  "billing",
  "documentation",
  "prescribing",
];

export async function GET() {
  try {
    const states = await prisma.state.findMany({
      include: {
        policies: {
          where: {
            status: "completed",
          },
          select: {
            id: true,
            title: true,
            uploadedAt: true,
            processedAt: true,
          },
        },
        facts: {
          select: {
            category: true,
            confidence: true,
          },
        },
        _count: {
          select: {
            facts: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
    
    return NextResponse.json({
      success: true,
      states: states.map((state: any) => {
        const uniqueCategories = new Set<string>();
        let confidenceSum = 0;

        for (const fact of state.facts) {
          if (fact?.category) {
            uniqueCategories.add(String(fact.category).toLowerCase());
          }
          confidenceSum += fact?.confidence ?? 0;
        }

        const categoriesCovered = EXPECTED_CATEGORIES.filter((category) =>
          uniqueCategories.has(category)
        );
        const missingCategories = EXPECTED_CATEGORIES.filter(
          (category) => !uniqueCategories.has(category)
        );

        const coverageRatio =
          EXPECTED_CATEGORIES.length > 0
            ? categoriesCovered.length / EXPECTED_CATEGORIES.length
            : 0;
        const coverageScore = Math.round(coverageRatio * 100);
        const avgConfidence = state.facts.length
          ? parseFloat((confidenceSum / state.facts.length).toFixed(2))
          : 0;

        const coverageLevel = (() => {
          if (coverageScore >= 75 && avgConfidence >= 0.7) return "High";
          if (coverageScore >= 40 && avgConfidence >= 0.5) return "Medium";
          if (coverageScore > 0) return "Low";
          return "None";
        })();

        return {
          id: state.id,
          name: state.name,
          abbreviation: state.abbreviation,
          policiesCount: state.policies.length,
          factsCount: state._count.facts,
          latestPolicy: state.policies[0] || null,
          coverageScore,
          coverageLevel,
          avgConfidence,
          categoriesCovered,
          missingCategories,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching states:", error);
    return NextResponse.json(
      { error: "Failed to fetch states" },
      { status: 500 }
    );
  }
}
