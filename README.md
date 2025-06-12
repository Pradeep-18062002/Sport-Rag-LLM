# 🏋️‍♂️ SportAI - PDF-based RAG Chatbot

SportAI is an intelligent **RAG (Retrieval-Augmented Generation)** chatbot that allows users to **upload sports-related PDFs** and then ask questions about their content. Built with **Next.js 15**, **OpenAI**, and **Astra DB**, this app mimics the functionality of ChatGPT but is powered by your own uploaded documents!


## 🔗 Live Demo

👉 [sport-rag-llm.vercel.app](https://sport-rag-llm.vercel.app)
---

##  Features

- 📄 Upload PDFs dynamically
- 🤖 Ask questions in natural language
- 🔍 Retrieves context from uploaded PDFs using vector embeddings
- 🧠 GPT-based contextual answering
- ☁️ Fully deployed on [Vercel](https://vercel.com)

---

## 🛠 Tech Stack

| Layer      | Tech                       |
|------------|----------------------------|
| Frontend   | Next.js (App Router)       |
| Backend    | API Routes (Node/TS)       |
| Embeddings | `text-embedding-3-small` via OpenAI |
| LLM        | OpenAI `gpt-4` or `gpt-3.5-turbo` |
| Vector DB  | Astra DB (DataStax)        |
| Styling    | Custom CSS + Tailwind-style layout |




