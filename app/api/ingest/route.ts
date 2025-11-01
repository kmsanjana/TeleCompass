import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractStateName } from "@/lib/pdf-processor";
import { queuePolicyProcessing } from "@/lib/ingest-runner";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Security gate - disabled by default
  if (process.env.ALLOW_INGEST !== "true") {
    return NextResponse.json(
      { error: "PDF ingestion is disabled" },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Extract state name from filename
    const stateName = extractStateName(file.name);
    
    // Get or create state
    let state = await prisma.state.findUnique({
      where: { name: stateName },
    });
    
    if (!state) {
      // Create state with abbreviation (you may want to add a mapping)
      const abbreviation = stateName.substring(0, 2).toUpperCase();
      state = await prisma.state.create({
        data: {
          name: stateName,
          abbreviation,
        },
      });
    }
    
    // Create policy record
    const policy = await prisma.policy.create({
      data: {
        stateId: state.id,
        title: file.name,
        fileName: file.name,
        fileSize: file.size,
        status: "processing",
      },
    });
    
    // Process PDF in background (in production, use a queue)
    queuePolicyProcessing(policy.id, buffer);
    
    return NextResponse.json({
      success: true,
      policyId: policy.id,
      stateName: state.name,
      message: "PDF uploaded successfully. Processing in background.",
    });
  } catch (error) {
    console.error("Error ingesting PDF:", error);
    return NextResponse.json(
      { error: "Failed to ingest PDF" },
      { status: 500 }
    );
  }
}

