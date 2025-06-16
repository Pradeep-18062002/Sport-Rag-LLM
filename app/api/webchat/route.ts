import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const webkey = `Bearer ${process.env.TAVILY_API_KEY}`;

interface SearchResult {
  content: string;
  url: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: { role: string; content: string }[] } = await req.json();
    const latest = messages[messages.length - 1];
    const latestUserMessage: string = latest.content;

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: webkey,
      },
      body: JSON.stringify({
        query: latestUserMessage,
        max_results: 5,
        include_answer: false,
      }),
    });

    const data: { results: SearchResult[] } = await response.json();
    const results = data.results;

    if (!results || results.length === 0) {
      return NextResponse.json({
        role: "assistant",
        content: "No relevant web results found. Please try rephrasing your question.",
        urls: [],
      });
    }

    const webContext = results
      .map((r: SearchResult, i: number) => `[${i + 1}] ${r.content.trim()} (${r.url})`)
      .join("\n\n");

    const urls = results.map((r: SearchResult) => r.url);

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an intelligent assistant. Use the following web results to answer the user's query. If the results are not helpful, answer based on your training:\n\n${webContext}`,
        },
        {
          role: "user",
          content: latestUserMessage,
        },
      ],
    });

    const answer = completion.choices[0].message.content;

    return NextResponse.json({
      role: "assistant",
      content: answer,
      urls,
    });
  } catch (err: unknown) {
    console.error("Webchat error:", err);
    return new Response("Error handling webchat request", { status: 500 });
  }
}