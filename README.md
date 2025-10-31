# TeleCompass 🧭

**AI-Powered Telehealth Policy Intelligence Platform**

TeleCompass is a comprehensive SaaS application that ingests state telehealth policy PDFs, extracts structured facts, and provides intelligent search, Q&A, comparison, and dashboard features for healthcare compliance professionals.

## Snapshots

**Landing Page**
![alt text](image.png)

**QnA Module**
![alt text](image-4.png)

**Search Module**
![alt text](image-2.png)

**Comparison Module**
![alt text](image-3.png)

## 🚀 Features

### 1. **Policy Finder** (Hybrid Search)
- Semantic search across all state telehealth policies
- AI-powered relevance scoring
- Snippet previews with page citations
- Filter by state

### 2. **RAG Q&A with Citations**
- Ask natural language questions about telehealth policies
- GPT-4 powered answers with confidence scores
- Full source citations (document + page number)
- Suggested follow-up questions for low-confidence responses

### 3. **Policy Comparator**
- Side-by-side comparison of up to 3 states
- Compare across key categories:
  - Modalities (Live video, Store-and-Forward, RPM, Audio-only)
  - Consent requirements
  - In-person visit rules


### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Ollama installed locally

### 1. Installation
```bash
git clone <repository>
cd TeleCompass
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/telecompass"
OLLAMA_HOST="http://localhost:11434"
OLLAMA_EMBED_MODEL="nomic-embed-text:latest"
OLLAMA_CHAT_MODEL="mistral:7b-instruct-q4_K_M"
ALLOW_INGEST="false"
```

### 3. Database Setup
```bash
npx prisma db push
npx prisma generate
```

### 4. Ollama Setup
```bash
# Install Ollama from https://ollama.ai
ollama serve  # Start Ollama server

6. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

### Core Models
- **State**: US states/territories
- **Policy**: Uploaded policy documents
- **PolicyChunk**: Text chunks with embeddings for RAG
- **PolicyFact**: Extracted structured facts
- **Comparison**: Saved comparisons
- **QueryLog**: Analytics and usage tracking


## 🔌 API Endpoints

### POST `/api/ingest`
Upload and process a PDF policy document
```typescript
FormData: { file: File }
Response: { success: boolean, policyId: string, stateName: string }
```

### POST `/api/search`
Hybrid semantic search
```typescript
Body: { query: string, states?: string[], topK?: number }
Response: { success: boolean, results: SearchResult[] }
```

### POST `/api/qa`
RAG-powered Q&A
```typescript
Body: { query: string, states?: string[] }
Response: { success: boolean, answer: string, confidence: number, citations: Citation[] }
```

### POST `/api/compare`
Compare policies across states
```typescript
Body: { stateNames: string[], categories?: string[] }
Response: { success: boolean, comparison: ComparisonTable }
```

### GET `/api/states`
List all states with metadata
```typescript
Response: { success: boolean, states: StateData[] }
```

## 🎯 Usage Guide

### 1. Ingest Policies
- Click "Upload PDF" in the header
- Select a state telehealth policy PDF
- Wait for background processing (embeddings + fact extraction)

### 2. Search Policies
- Navigate to "Search" tab
- Enter a query (e.g., "consent requirements for live video")
- View ranked results with snippets and citations

### 3. Ask Questions
- Navigate to "Q&A" tab
- Ask natural language questions
- Review AI-generated answers with confidence scores
- Check citations for verification

### 4. Compare States
- Navigate to "Compare" tab
- Select 2-3 states
- Click "Compare Policies"
- Review side-by-side comparison table

### 5. View Dashboard
- Navigate to "Dashboard" tab
- Monitor coverage statistics
- Identify compliance risks
- Track processing status

## 🧪 Development

### Run Prisma Studio (Database GUI)
```bash
npm run db:studio
```

### Build for Production
```bash
npm run build
npm start
```

### Lint Code
```bash
npm run lint
```


## 🔐 Security Notes

- Never commit `.env` files
- Use environment variables for all secrets
- Implement authentication before production deployment
- Rate limit API endpoints
- Validate and sanitize all user inputs
- Use HTTPS in production

## 🚧 Roadmap

### MVP 
- [x] PDF ingestion pipeline
- [x] Hybrid search with embeddings
- [x] RAG Q&A with citations
- [x] Multi-state comparison
- [x] Dashboard visualizations

### Future Enhancements
- [ ] User authentication (NextAuth.js)
- [ ] Saved searches and comparisons
- [ ] Semantic diff for policy updates
- [ ] Export to PDF/Excel
- [ ] Advanced filtering and faceted search
- [ ] API rate limiting and quotas
- [ ] Multi-tenant support
- [ ] Mobile responsive improvements
- [ ] Real-time collaboration features

📝 License

Proprietary – All Rights Reserved


📧 Support

For technical support or feature requests, please open an issue in the repository.

Built for healthcare compliance professionals.

Developed by Aditya and Sanjana, with special thanks to the Center for Connected Health Policy (CCHP) — https://www.cchpca.org/
