import { generateEmbedding, generateChatCompletion, cosineSimilarity } from "./openai";
import { prisma } from "./db";

export interface SearchResult {
  chunkId: string;
  content: string;
  pageNumber: number;
  similarity: number;
  policyId: string;
  stateName: string;
  policyTitle: string;
}

export interface RAGResponse {
  answer: string;
  confidence: number;
  citations: Array<{
    content: string;
    pageNumber: number;
    stateName: string;
    policyTitle: string;
  }>;
  suggestedQueries?: string[];
}

export interface ConversationHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const SIMILARITY_THRESHOLD = 0.7;
const TOP_K_RESULTS = 5;

export async function hybridSearch(
  query: string,
  stateFilter?: string[],
  topK: number = TOP_K_RESULTS
): Promise<SearchResult[]> {
  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Get all chunks (with optional state filter)
    const chunks = await prisma.policyChunk.findMany({
      where: stateFilter
        ? {
            policy: {
              state: {
                name: { in: stateFilter },
              },
            },
          }
        : undefined,
      include: {
        policy: {
          include: {
            state: true,
          },
        },
      },
    });
    
    // Calculate similarities
    const results: SearchResult[] = chunks
      .map((chunk) => {
        if (!chunk.embedding) return null;
        
        const embedding = chunk.embedding as number[];
        const similarity = cosineSimilarity(queryEmbedding, embedding);
        
        return {
          chunkId: chunk.id,
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          similarity,
          policyId: chunk.policyId,
          stateName: chunk.policy.state.name,
          policyTitle: chunk.policy.title,
        };
      })
      .filter((result): result is SearchResult => result !== null && result.similarity >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
    
    return results;
  } catch (error) {
    console.error("Error in hybrid search:", error);
    throw new Error("Search failed");
  }
}

export async function ragQuery(
  query: string,
  stateFilter?: string[],
  history: ConversationHistoryMessage[] = []
): Promise<RAGResponse> {
  try {
    // Search for relevant chunks
    const searchResults = await hybridSearch(query, stateFilter);
    
    if (searchResults.length === 0) {
      return {
        answer: "I couldn't find relevant information to answer your question. Try rephrasing or asking about specific telehealth modalities, billing codes, or state requirements.",
        confidence: 0,
        citations: [],
        suggestedQueries: [
          "What are the live video requirements?",
          "Does this state allow store-and-forward?",
          "What are the consent requirements?",
        ],
      };
    }
    
    // Build context from top results
    const context = searchResults
      .map(
        (result, idx) =>
          `[${idx + 1}] From ${result.stateName} (Page ${result.pageNumber}):\n${result.content}`
      )
      .join("\n\n");
    
    // Generate answer using Ollama
    const systemPrompt = `You are a telehealth policy expert assistant. Answer questions based ONLY on the provided context from state telehealth policy documents.

Rules:
1. Only use information from the provided context
2. Always cite sources using [number] notation
3. If the context doesn't contain enough information, say so clearly
4. Be concise and specific
5. For regulatory questions, quote exact requirements when possible
6. If confidence is low, suggest alternative queries`;

    const userPrompt = `Context from policy documents:
${context}

Question: ${query}

Provide a clear, cited answer. Use [1], [2], etc. to reference the context sources.`;

    const trimmedHistory = history.slice(-10).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const answer = await generateChatCompletion(
      [
        { role: "system", content: systemPrompt },
        ...trimmedHistory,
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.3,
        numPredict: 512,
      }
    );
    
    // Calculate confidence based on similarity scores
    const avgSimilarity = searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length;
    const confidence = Math.min(avgSimilarity * 1.2, 1.0); // Scale up slightly
    
    return {
      answer,
      confidence,
      citations: searchResults.map((result) => ({
        content: result.content,
        pageNumber: result.pageNumber,
        stateName: result.stateName,
        policyTitle: result.policyTitle,
      })),
    };
  } catch (error) {
    console.error("Error in RAG query:", error);
    throw new Error("Failed to generate answer");
  }
}

export async function extractPolicyFacts(policyId: string): Promise<void> {
  try {
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        chunks: true,
        state: true,
      },
    });
    
    if (!policy) throw new Error("Policy not found");
    
    const fullText = policy.chunks.map((c) => c.content).join("\n");
    
    const systemPrompt = `You are a telehealth policy extraction expert. Extract structured facts from state telehealth policy documents.

Extract the following categories:
1. Modalities: live_video, store_and_forward, rpm, audio_only
2. Consent: requirements and specifics
3. In-person requirements: initial visit rules
4. Provider eligibility: who can provide telehealth
5. Site eligibility: originating/distant site rules
6. Billing: facility fees, modifiers (GT, FQ, 95), reimbursement parity
7. Documentation: special requirements (e.g., BMI recording)
8. Prescribing: controlled substances, restrictions

Return JSON format:
{
  "facts": [
    {
      "category": "modality",
      "field": "live_video",
      "value": "Allowed with no restrictions",
      "confidence": 0.95,
      "page": 3
    }
  ]
}`;

    const extractionRaw = await generateChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract facts from this ${policy.state.name} policy:\n\n${fullText.slice(0, 12000)}` },
      ],
      {
        temperature: 0.1,
        numPredict: 1024,
      }
    );

    let result: { facts?: Array<any> } = {};

    try {
      const jsonMatch = extractionRaw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn("Failed to parse extracted facts JSON", error);
    }
    
    // Store facts in database
    if (result.facts && Array.isArray(result.facts)) {
      for (const fact of result.facts) {
        await prisma.policyFact.create({
          data: {
            policyId: policy.id,
            stateId: policy.stateId,
            category: fact.category,
            field: fact.field,
            value: fact.value,
            confidence: fact.confidence || 0.5,
            pageNumber: fact.page,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error extracting policy facts:", error);
    throw new Error("Failed to extract policy facts");
  }
}
