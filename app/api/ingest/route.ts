import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processPDF, embedChunks, extractStateName } from "@/lib/pdf-processor";
import { extractPolicyFacts } from "@/lib/rag";

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
    processPDFAsync(policy.id, buffer);
    
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

async function processPDFAsync(policyId: string, buffer: Buffer) {
  try {
    console.log(`🔄 Starting processing for policy ${policyId}`);
    
    // Process PDF
    console.log(`📄 Extracting text from PDF...`);
    const processed = await processPDF(buffer);
    console.log(`✅ Extracted ${processed.chunks.length} chunks`);
    
    // Generate embeddings
    console.log(`🧠 Generating embeddings...`);
    const chunksWithEmbeddings = await embedChunks(processed.chunks);
    console.log(`✅ Generated ${chunksWithEmbeddings.length} embeddings`);
    
    // Store chunks in database
    console.log(`💾 Storing chunks in database...`);
    await prisma.policyChunk.createMany({
      data: chunksWithEmbeddings.map((chunk) => ({
        policyId,
        content: chunk.content,
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        embedding: chunk.embedding,
      })),
    });
    console.log(`✅ Stored ${chunksWithEmbeddings.length} chunks`);
    
    // Extract structured facts
    console.log(`🔍 Extracting policy facts...`);
    await extractPolicyFacts(policyId);
    console.log(`✅ Facts extracted`);
    
    // Update policy status
    await prisma.policy.update({
      where: { id: policyId },
      data: {
        status: "completed",
        processedAt: new Date(),
      },
    });
    
    console.log(`🎉 Successfully processed policy ${policyId}`);
  } catch (error) {
    console.error(`❌ Error processing policy ${policyId}:`, error);
    console.error(`❌ Error details:`, error instanceof Error ? error.message : String(error));
    console.error(`❌ Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
    
    await prisma.policy.update({
      where: { id: policyId },
      data: { status: "failed" },
    });
  }
}
