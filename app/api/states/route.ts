import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
      states: states.map((state: any) => ({
        id: state.id,
        name: state.name,
        abbreviation: state.abbreviation,
        policiesCount: state.policies.length,
        factsCount: state._count.facts,
        latestPolicy: state.policies[0] || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching states:", error);
    return NextResponse.json(
      { error: "Failed to fetch states" },
      { status: 500 }
    );
  }
}
