"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Send, Bot, User, MessageSquare } from "lucide-react";

function TypingIndicator({ label }) {
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
      <div
        style={{
          width: "30px", height: "30px", borderRadius: "50%",
          background: "#1d4ed8",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Bot size={15} color="white" />
      </div>
      <div
        style={{
          padding: "10px 16px",
          borderRadius: "16px 16px 16px 4px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: "8px",
          fontSize: "0.78rem", color: "var(--text-secondary)",
        }}
      >
        <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#1d4ed8",
                animation: `bounceDot 1.4s ease-in-out ${i * 0.16}s infinite`,
              }}
            />
          ))}
        </div>
        <span>{label}</span>
      </div>
    </div>
  );
}

function ChatMessage({ message }) {
  const isBot = message.role === "bot";
  return (
    <div
      className="fade-in-up"
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "flex-end",
        flexDirection: isBot ? "row" : "row-reverse",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: "30px", height: "30px", minWidth: "30px",
          borderRadius: "50%",
          background: isBot ? "#1d4ed8" : "#475569",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isBot ? <Bot size={15} color="white" /> : <User size={15} color="white" />}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: "78%",
          padding: "10px 14px",
          borderRadius: isBot ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
          background: isBot ? "var(--surface)" : "#1d4ed8",
          color: isBot ? "var(--text-primary)" : "#ffffff",
          border: isBot ? "1px solid var(--border)" : "none",
          fontSize: "0.865rem",
          lineHeight: "1.65",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {message.text}
      </div>
    </div>
  );
}

export function ChatUI() {
  const { t } = useLanguage();

  const welcomeMessage = {
    role: "bot",
    text: "Namaste! 🙏 I am Chunav Saathi. Ask me about voter registration, EPIC IDs, or election timelines.",
    id: "welcome",
  };

  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", text, id: Date.now().toString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({
            role: m.role === "bot" ? "model" : "user",
            parts: [{ text: m.text }],
          })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.reply || "Sorry, I couldn't get a response. Please try again.",
          id: (Date.now() + 1).toString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Connection error. Please check your network and try again.",
          id: (Date.now() + 1).toString(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    "How to register as a voter?",
    "What is an EPIC card?",
    "Helpline number?",
    "What is Form 6?",
  ];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: "580px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: "#1d4ed8",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}
        >
          <MessageSquare size={18} color="white" />
          {/* Online dot */}
          <div
            style={{
              position: "absolute", bottom: "2px", right: "2px",
              width: "9px", height: "9px", borderRadius: "50%",
              background: "#16a34a",
              border: "2px solid var(--surface)",
            }}
          />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
            {t.chatTitle}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            {t.chatSubtitle}
          </div>
        </div>
        {/* ECI badge */}
        <div
          style={{
            marginLeft: "auto",
            padding: "3px 10px",
            borderRadius: "4px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "#1d4ed8",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          ECI GUIDED
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        id="chat-messages"
        style={{
          flex: 1, overflowY: "auto",
          padding: "18px",
          display: "flex", flexDirection: "column", gap: "14px",
          background: "var(--background)",
        }}
      >
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {loading && <TypingIndicator label={t.typing} />}
      </div>

      {/* Quick prompts */}
      <div
        style={{
          padding: "10px 16px 8px",
          display: "flex", gap: "6px", flexWrap: "wrap",
          borderTop: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
            style={{
              padding: "4px 11px",
              borderRadius: "6px",
              fontSize: "0.7rem",
              fontWeight: 500,
              border: "1px solid var(--border-strong)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#1d4ed8";
              e.currentTarget.style.color = "#1d4ed8";
              e.currentTarget.style.background = "#eff6ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          display: "flex", gap: "8px", alignItems: "flex-end",
          background: "var(--surface)",
        }}
      >
        <textarea
          ref={inputRef}
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t.placeholder}
          rows={1}
          className="civic-input"
          style={{
            flex: 1,
            resize: "none",
            maxHeight: "100px",
            overflowY: "auto",
            lineHeight: "1.5",
          }}
        />
        <button
          id="chat-send"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            width: "40px", height: "40px",
            borderRadius: "8px", border: "none",
            background: loading || !input.trim() ? "var(--muted-bg)" : "#1d4ed8",
            color: loading || !input.trim() ? "var(--text-muted)" : "white",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s ease", flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>

      <style>{`
        @keyframes bounceDot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
