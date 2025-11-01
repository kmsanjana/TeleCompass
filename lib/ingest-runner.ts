import fs from "fs";
import path from "path";
import { prisma } from "./db";
import { processPDF, embedChunks } from "./pdf-processor";
import { extractPolicyFacts } from "./rag";

interface IngestionJob {
  policyId: string;
  buffer?: Buffer;
  filePath?: string;
  deleteFileAfter?: boolean;
}

const jobQueue: IngestionJob[] = [];
let isProcessing = false;

export function queuePolicyProcessing(
  policyId: string,
  buffer?: Buffer | null,
  options: { filePath?: string; deleteFileAfter?: boolean } = {}
) {
  const job: IngestionJob = {
    policyId,
    buffer: buffer ?? undefined,
    filePath: options.filePath,
    deleteFileAfter: options.deleteFileAfter,
  };

  jobQueue.push(job);
  void processQueue();
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    if (!job) break;

    try {
      console.log(`🔄 Processing policy ${job.policyId}`);
      const buffer = await resolveBuffer(job);

      console.log(`📄 Extracting text...`);
      const processed = await processPDF(buffer);
      console.log(`✅ ${processed.chunks.length} chunks extracted`);

      console.log(`🧠 Generating embeddings...`);
      const chunksWithEmbeddings = await embedChunks(processed.chunks);
      console.log(`✅ ${chunksWithEmbeddings.length} embeddings generated`);

      console.log(`💾 Writing chunks to database...`);
      await prisma.policyChunk.createMany({
        data: chunksWithEmbeddings.map((chunk) => ({
          policyId: job.policyId,
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex,
          embedding: chunk.embedding,
        })),
      });

      console.log(`🔍 Extracting structured facts...`);
      await extractPolicyFacts(job.policyId);

      await prisma.policy.update({
        where: { id: job.policyId },
        data: {
          status: "completed",
          processedAt: new Date(),
        },
      });

      console.log(`🎉 Policy ${job.policyId} processed successfully`);
    } catch (error) {
      console.error(`❌ Failed processing policy ${job?.policyId}:`, error);

      await prisma.policy.update({
        where: { id: job?.policyId },
        data: { status: "failed" },
      });
    } finally {
      if (job?.deleteFileAfter && job.filePath) {
        try {
          await fs.promises.unlink(job.filePath);
        } catch (unlinkError) {
          console.warn(`⚠️ Failed to delete temp file ${job.filePath}:`, unlinkError);
        }
      }
    }
  }

  isProcessing = false;
}

async function resolveBuffer(job: IngestionJob): Promise<Buffer> {
  if (job.buffer) {
    return job.buffer;
  }

  if (job.filePath) {
    return fs.promises.readFile(job.filePath);
  }

  throw new Error("No buffer or file path provided for ingestion job");
}
