# 🚀 TeleCompass Quick Start Guide

This guide will get you up and running with TeleCompass in under 10 minutes.

## ✅ Prerequisites Checklist

Before starting, make sure you have:
- [ ] **Node.js 18+** installed ([Download](https://nodejs.org/))
- [ ] **PostgreSQL** database running ([Download](https://www.postgresql.org/download/))
- [ ] **Ollama** installed ([Download](https://ollama.ai/))
- [ ] **Git** for cloning the repository

## 📦 Step 1: Installation

```bash
# Clone the repository
git clone <your-repository-url>
cd TeleCompass

# Install dependencies
npm install
```

## ⚙️ Step 2: Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env
```

Edit the `.env` file with your settings:

```env
# Database Connection (Required)
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/telecompass"

# Ollama Configuration (Required)
OLLAMA_HOST="http://localhost:11434"
OLLAMA_EMBED_MODEL="nomic-embed-text:latest"
OLLAMA_CHAT_MODEL="mistral:7b-instruct-q4_K_M"

# Security (Important)
ALLOW_INGEST="false"

# NextAuth (Optional for now)
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

## 🗄️ Step 3: Database Setup

```bash
# Create database tables
npx prisma db push

# Generate Prisma client
npx prisma generate

# (Optional) Open database browser
npm run db:studio
```

## 🤖 Step 4: Ollama Setup

```bash
# Start Ollama server (keep this running)
ollama serve
```

In a new terminal, pull the required models:

```bash
# Pull embedding model (274MB)
ollama pull nomic-embed-text:latest

# Pull chat model (4.4GB - this may take a while)
ollama pull mistral:7b-instruct-q4_K_M

# Verify models are installed
ollama list
```

## 🚀 Step 5: Start the Application

```bash
# Start the development server
npm run dev
```

Open your browser and navigate to: **http://localhost:3000**

You should see the TeleCompass interface with four tabs:
- **Search**: Semantic policy search
- **Q&A**: Ask questions about policies  
- **Compare**: Compare policies across states
- **Dashboard**: Overview and statistics

## 📄 Step 6: Load Sample Data (Optional)

To test the full functionality, you can ingest some PDF policies:

### 6.1 Prepare PDF Files
```bash
# Create the PDF folder
mkdir Policy_data_CCHP

# Add your PDF files to this folder
# Files should be named like: "CCHP Alabama Telehealth Laws Report, 07-18-2025.pdf"
```

### 6.2 Enable Ingestion
```bash
# Edit .env file
ALLOW_INGEST="true"

# Restart the dev server
npm run dev
```

### 6.3 Run Bulk Ingestion
```bash
# Run the ingestion script
node scripts/bulk-ingest.js
```

### 6.4 Disable Ingestion (Security)
```bash
# Edit .env file
ALLOW_INGEST="false"

# Restart the dev server
npm run dev
```

## ✅ Verification Steps

### Test Search
1. Go to the **Search** tab
2. Enter: "consent requirements for telehealth"
3. You should see relevant results (if data is loaded)

### Test Q&A
1. Go to the **Q&A** tab  
2. Ask: "What are the billing requirements for telehealth?"
3. You should get an AI-generated answer with citations

### Test Comparison
1. Go to the **Compare** tab
2. Select 2-3 states (if data is loaded)
3. Click "Compare Policies"
4. You should see a side-by-side comparison

### Test Dashboard
1. Go to the **Dashboard** tab
2. You should see statistics and state coverage information

## 🔧 Troubleshooting

### Common Issues

**Port 3000 already in use**
```bash
# Kill the process using port 3000
npx kill-port 3000
# Or use a different port
npm run dev -- -p 3001
```

**Database connection error**
- Check PostgreSQL is running: `pg_ctl status`
- Verify DATABASE_URL in .env
- Create database: `createdb telecompass`

**Ollama connection error**
- Check Ollama is running: `ollama list`
- Verify OLLAMA_HOST in .env
- Restart Ollama: `ollama serve`

**Models not found**
```bash
# Re-pull models
ollama pull nomic-embed-text:latest
ollama pull mistral:7b-instruct-q4_K_M
```

**PDF ingestion fails**
- Check ALLOW_INGEST="true" in .env
- Verify PDF files are in Policy_data_CCHP/
- Check server logs for specific errors

## 🎯 Next Steps

Once everything is working:

1. **Read NEXT_STEPS.md** for advanced configuration
2. **Add your PDF policies** to the Policy_data_CCHP folder
3. **Customize the UI** in the components/features folder
4. **Deploy to production** (see README.md deployment section)

## 📞 Getting Help

If you encounter issues:

1. Check the **troubleshooting section** above
2. Review the **server logs** in your terminal
3. Open **Prisma Studio** to inspect the database
4. Check **Ollama logs** for AI-related issues

## 🎉 Success!

If you can search, ask questions, and see the dashboard, you're all set! 

TeleCompass is now running locally with:
- ✅ Local AI (no API costs)
- ✅ Semantic search capabilities  
- ✅ Q&A with citations
- ✅ Policy comparison tools
- ✅ Analytics dashboard

Ready to explore telehealth policies with AI! 🚀
