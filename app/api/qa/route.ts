import { NextRequest, NextResponse } from "next/server";
import { ragQuery, type ConversationHistoryMessage } from "@/lib/rag";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, states, history } = body;
    
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    
    const sanitizedHistory: ConversationHistoryMessage[] = Array.isArray(history)
      ? history
          .filter(
            (item: any): item is ConversationHistoryMessage =>
              item &&
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string" &&
              item.content.trim().length > 0
          )
          .map((item) => ({
            role: item.role,
            content: item.content.trim(),
          }))
      : [];

    const startTime = Date.now();
    
    // Perform RAG query
    const response = await ragQuery(query, states, sanitizedHistory);
    
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
