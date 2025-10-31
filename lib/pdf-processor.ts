import pdf from "pdf-parse";
import { generateEmbeddings } from "./openai";

export interface PDFChunk {
  content: string;
  pageNumber: number;
  chunkIndex: number;
}

export interface ProcessedPDF {
  text: string;
  numPages: number;
  chunks: PDFChunk[];
}

const CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200; // characters

export async function processPDF(buffer: Buffer): Promise<ProcessedPDF> {
  try {
    const data = await pdf(buffer);
    
    const chunks = createChunks(data.text, data.numpages);
    
    return {
      text: data.text,
      numPages: data.numpages,
      chunks,
    };
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error("Failed to process PDF file");
  }
}

function createChunks(text: string, numPages: number): PDFChunk[] {
  const chunks: PDFChunk[] = [];
  let chunkIndex = 0;
  
  // Simple chunking strategy - split by size with overlap
  for (let i = 0; i < text.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    
    // Estimate page number (rough approximation)
    const estimatedPage = Math.ceil((i / text.length) * numPages);
    
    chunks.push({
      content: chunk.trim(),
      pageNumber: estimatedPage,
      chunkIndex: chunkIndex++,
    });
  }
  
  return chunks;
}

export async function embedChunks(chunks: PDFChunk[]): Promise<Array<PDFChunk & { embedding: number[] }>> {
  const texts = chunks.map(chunk => chunk.content);
  const embeddings = await generateEmbeddings(texts);
  
  return chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));
}

export function extractStateName(fileName: string): string {
  // Extract state name from "CCHP Alabama Telehealth Laws Report, 07-18-2025.pdf"
  const match = fileName.match(/CCHP\s+(.+?)\s+Telehealth/i);
  return match ? match[1] : "Unknown";
}
