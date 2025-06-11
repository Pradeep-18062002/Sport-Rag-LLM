"use client";
import Image from "next/image";
import llmlogo from "./assets/llmlogo.png";
import { useEffect, useState, useRef } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");

  const chatWindowRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatWindowRef.current?.scrollTo({
        top: chatWindowRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error: Failed to generate a response." }]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: Something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setPdfFile(e.target.files[0]);
      setUploadStatus(`Selected: ${e.target.files[0].name}`);
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) return;

    const formData = new FormData();
    formData.append("file", pdfFile);
    setUploadStatus("Uploading...");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      setUploadStatus("PDF uploaded and processed!");
      setPdfFile(null);
    } else {
      setUploadStatus("Upload failed.");
    }
  };

  return (
    <main className="p-6">
      <Image src={llmlogo} width={250} alt="llmlogo" />

      <section className={messages.length ? "populated" : ""} style={{ height: "100%" }}>
        {messages.length === 0 ? (
          <div className="starter-text">
            <p>Welcome to Sporthon's SportAI.</p>
            <p>The Ultimate Place for All Things Sports!</p>
            <p>We hope you enjoy!</p>
          </div>
        ) : (
          <div className="chat-window" ref={chatWindowRef}>
            {messages.map((m, i) => (
              <div key={i} className={`message-bubble ${m.role === "user" ? "user-message" : "ai-message"}`}>
                <strong>{m.role === "user" ? "You" : "AI"}:</strong>
                <span>{m.content}</span>
              </div>
            ))}
            {isLoading && (
              <div className="message-bubble ai-message">
                <strong>AI:</strong> <em>Thinking...</em>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="bottom-section">
        <form onSubmit={handleSubmit}>
          <input
            className="question-box"
            placeholder="Ask me something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <input type="submit" value={isLoading ? "..." : "Ask"} disabled={isLoading} />
        </form>

        <div className="upload-section">
          <h3>Upload a PDF</h3>
          <input type="file" accept=".pdf" onChange={handleFileChange} />
          <button onClick={handlePdfUpload} disabled={!pdfFile || uploadStatus === "Uploading..."}>
            {uploadStatus === "Uploading..." ? "Uploading..." : "Upload"}
          </button>
          {uploadStatus && <p>{uploadStatus}</p>}
        </div>
      </div>
    </main>
  );
}
