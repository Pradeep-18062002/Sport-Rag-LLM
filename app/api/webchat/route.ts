import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { DataAPIClient } from "@datastax/astra-db-ts";
import "dotenv/config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(process.env.ASTRA_DB_API_ENDPOINT!, {
  namespace: process.env.ASTRA_DB_NAMESPACE!,
});

interface Message {
  role: string;
  content: string;
}

interface Document {
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await req.json();
    const latest: Message = messages[messages.length - 1];
    const latestUserMessage: string = latest.content;

    console.log(`User question: ${latestUserMessage}`);

    // RAG Pipeline
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: latestUserMessage,
    });

    const collection = await db.collection(process.env.ASTRA_DB_COLLECTION!);

    const searchResults = await collection.find(
      {},
      {
        vector: embeddingResponse.data[0].embedding,
        limit: 6,
        includeSimilarity: true,
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documents: Document[] = await searchResults.toArray();

    const context = documents
      .map((doc: Document, i: number) => `[Doc ${i + 1}] ${doc.content}`)
      .join("\n\n");

    console.log(`Found ${documents.length} relevant documents`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an intelligent assistant. Use the provided context below if it contains relevant information. If the context does not help, use your general knowledge to answer accurately and helpfully.\n\nContext:\n${context}`,
        },
        { role: "user", content: latestUserMessage },
      ],
    });

    const answer = completion.choices[0].message.content;

    return NextResponse.json({
      role: "assistant",
      content: answer,
    });
  } catch (err) {
    console.error("API Error:", err);
    return new Response("Error", { status: 500 });
  }
}
