import { Ollama } from "ollama";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text:latest";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "mistral:7b-instruct-q4_K_M";

const ollama = new Ollama({ host: OLLAMA_HOST });

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await ollama.embeddings({
      model: OLLAMA_EMBED_MODEL,
      prompt: text,
    });
    return response.embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding. Ensure Ollama is running and the model is available.");
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }
  
  return embeddings;
}

export async function generateChatCompletion(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    numPredict?: number;
  }
): Promise<string> {
  try {
    const response = await ollama.chat({
      model: OLLAMA_CHAT_MODEL,
      messages,
      options: {
        temperature: options?.temperature ?? 0.3,
        num_predict: options?.numPredict ?? 512,
      },
    });
    
    return response.message?.content ?? "";
  } catch (error) {
    console.error("Error generating chat completion:", error);
    throw new Error("Failed to generate response. Ensure Ollama is running and the model is available.");
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
