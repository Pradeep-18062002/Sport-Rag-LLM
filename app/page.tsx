"use client";
import Image from "next/image";
import llmlogo from "./assets/llmlogo.png";
import { useEffect, useState, useRef } from "react";
import "./global.css";
import React from "react";

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
const [useWebSearch, setUseWebSearch] = useState(false);

const chatWindowRef = useRef<HTMLDivElement>(null);

function renderContent(content: string): React.JSX.Element[] {
const parts = content.split(/(\[\d+\]\shttps?:\/\/[^\s]+)/g);

return parts.map((part, idx) => {
const match = part.match(/\[(\d+)\]\s(https?:\/\/[^\s]+)/);
if (match) {
const label = `[${match[1]}]`;
const url = match[2];
return (
<span key={idx}>
{label} <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>{" "}
</span>
);
}
return <span key={idx}>{part}</span>;
});
}

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
const endpoint = useWebSearch ? "/api/webchat" : "/api/chat";

const res = await fetch(endpoint, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ messages: [...messages, userMessage] }),
});

const data = await res.json();

if (res.ok) {
if (useWebSearch && data.urls?.length) {
const combinedContent = `${data.content}\n\n  sources:\n${data.urls.map((url: string, i: number) => `[${i + 1}] ${url}`).join("\n")}`;
setMessages((prev) => [...prev, { role: "assistant", content: combinedContent }]);
} else {
setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
}
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

try {
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
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
setUploadStatus("Upload failed.");
}
};

return (
<main>
<div className="header-section">
<Image src={llmlogo} width={150} alt="llmlogo" />
</div>

<div className="content-area">
<section className={messages.length ? "populated" : ""}>
{messages.length === 0 ? (
<div className="starter-text">
<p>Welcome to Sporthon&apos;s SportAI.</p>
<p>The Ultimate Place for All Sports!</p>
<p>We hope you enjoy!</p>
</div>
) : (
<div className="chat-window" ref={chatWindowRef}>
{messages.map((m, i) => (
<div key={i} className={`message-bubble ${m.role === "user" ? "user-message" : "ai-message"}`}>
<strong>{m.role === "user" ? "You" : "AI"}:</strong>
<span>{renderContent(m.content)}</span>
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
</div>

<div className="bottom-section">
<label>
<input
type="checkbox"
checked={useWebSearch}
onChange={(e) => setUseWebSearch(e.target.checked)}
/>
Enable Internet Search
</label>
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
<div>
<input type="file" accept=".pdf" onChange={handleFileChange} />
<button onClick={handlePdfUpload} disabled={!pdfFile || uploadStatus === "Uploading..."}>
{uploadStatus === "Uploading..." ? "Uploading..." : "Upload"}
</button>
</div>
{uploadStatus && (
<p
className={
uploadStatus.includes("failed")
? "error"
: uploadStatus.includes("processed")
? "success"
: uploadStatus.includes("Uploading")
? "uploading"
: ""
}
>
{uploadStatus}
</p>
)}
</div>
</div>
</main>
);
}