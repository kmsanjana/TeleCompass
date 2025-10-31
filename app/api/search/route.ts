import { NextRequest, NextResponse } from "next/server";
import { hybridSearch } from "@/lib/rag";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, states, topK = 10 } = body;
    
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    
    const startTime = Date.now();
    
    // Perform hybrid search
    const results = await hybridSearch(query, states, topK);
    
    const executionTime = Date.now() - startTime;
    
    // Log query
    await prisma.queryLog.create({
      data: {
        query,
        queryType: "search",
        executionTime,
      },
    });
    
    return NextResponse.json({
      success: true,
      results: results.map(result => ({
        id: result.chunkId,
        snippet: result.content.substring(0, 200) + "...",
        fullContent: result.content,
        pageNumber: result.pageNumber,
        state: result.stateName,
        policyTitle: result.policyTitle,
        relevanceScore: result.similarity,
      })),
      executionTime,
    });
  } catch (error) {
    console.error("Error performing search:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
