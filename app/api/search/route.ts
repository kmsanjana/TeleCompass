import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { hybridSearch } from "@/lib/rag";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, states, topK = 10 } = body;
    
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    
    const cookieStore = cookies();
    let sessionToken = cookieStore.get("telecompass_session")?.value;
    let shouldSetCookie = false;

    if (!sessionToken) {
      sessionToken = randomUUID();
      shouldSetCookie = true;
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
        sessionToken,
        executionTime,
      },
    });

    const statesJoined = Array.isArray(states) ? states.join(",") : "";

    await prisma.searchHistory.create({
      data: {
        userToken: sessionToken,
        query,
        states: statesJoined,
        topK,
        resultsCount: results.length,
        executionTime,
      },
    });
    
    const response = NextResponse.json({
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

    if (shouldSetCookie && sessionToken) {
      response.cookies.set({
        name: "telecompass_session",
        value: sessionToken,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error("Error performing search:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}
