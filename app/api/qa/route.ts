import { NextRequest, NextResponse } from "next/server";
import { ragQuery } from "@/lib/rag";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, states } = body;
    
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    
    const startTime = Date.now();
    
    // Perform RAG query
    const response = await ragQuery(query, states);
    
    const executionTime = Date.now() - startTime;
    
    // Log query
    await prisma.queryLog.create({
      data: {
        query,
        queryType: "qa",
        response: response.answer,
        confidence: response.confidence,
        executionTime,
      },
    });
    
    return NextResponse.json({
      success: true,
      answer: response.answer,
      confidence: response.confidence,
      citations: response.citations,
      suggestedQueries: response.suggestedQueries,
      executionTime,
    });
  } catch (error) {
    console.error("Error performing Q&A:", error);
    return NextResponse.json(
      { error: "Failed to answer question" },
      { status: 500 }
    );
  }
}
