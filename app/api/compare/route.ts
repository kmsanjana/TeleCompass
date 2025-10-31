import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stateNames, categories } = body;
    
    if (!stateNames || stateNames.length === 0) {
      return NextResponse.json({ error: "States are required" }, { status: 400 });
    }
    
    if (stateNames.length > 3) {
      return NextResponse.json({ error: "Maximum 3 states allowed" }, { status: 400 });
    }
    
    // Get states
    const states = await prisma.state.findMany({
      where: {
        name: { in: stateNames },
      },
      include: {
        facts: {
          where: categories ? { category: { in: categories } } : undefined,
        },
      },
    });
    
    // Organize facts by category and field
    const comparison: Record<string, Record<string, Record<string, any>>> = {};
    
    for (const state of states) {
      comparison[state.name] = {};
      
      for (const fact of state.facts) {
        if (!comparison[state.name][fact.category]) {
          comparison[state.name][fact.category] = {};
        }
        
        comparison[state.name][fact.category][fact.field] = {
          value: fact.value,
          confidence: fact.confidence,
          pageNumber: fact.pageNumber,
        };
      }
    }
    
    // Get all unique categories and fields
    const allCategories = new Set<string>();
    const allFields: Record<string, Set<string>> = {};
    
    for (const state of states) {
      for (const fact of state.facts) {
        allCategories.add(fact.category);
        
        if (!allFields[fact.category]) {
          allFields[fact.category] = new Set();
        }
        allFields[fact.category].add(fact.field);
      }
    }
    
    // Build structured comparison table
    const comparisonTable = Array.from(allCategories).map((category) => ({
      category,
      fields: Array.from(allFields[category] || []).map((field) => ({
        field,
        values: stateNames.map((stateName: string) => ({
          state: stateName,
          value: comparison[stateName]?.[category]?.[field]?.value || "Not specified",
          confidence: comparison[stateName]?.[category]?.[field]?.confidence || 0,
          pageNumber: comparison[stateName]?.[category]?.[field]?.pageNumber,
        })),
      })),
    }));
    
    return NextResponse.json({
      success: true,
      states: stateNames,
      comparison: comparisonTable,
    });
  } catch (error) {
    console.error("Error comparing policies:", error);
    return NextResponse.json(
      { error: "Failed to compare policies" },
      { status: 500 }
    );
  }
}
