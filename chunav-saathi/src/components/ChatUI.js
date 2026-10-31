"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useLanguage } from "@/context/LanguageContext";
import { Send, Bot, User, MessageSquare, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const WELCOME = {
  id: "welcome",
  role: "assistant",
  parts: [{
    type: "text",
    text: "Namaste! Ask about available booth records or complaint counts.",
  }],
};

const QUICK_PROMPTS = [
  "Belthangady polling booths?",
  "Complaint counts by status in Karnataka?",
];

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
      <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Bot size={15} color="white" />
      </div>
      <div style={{ padding: "10px 16px", borderRadius: "16px 16px 16px 4px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "5px" }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--primary)", animation: `bounceDot 1.4s ease-in-out ${i * 0.16}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

function Bubble({ msg }) {
  const isBot = msg.role === "assistant";
  const content = (msg.parts || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
  return (
    <div className="fade-in-up" style={{ display: "flex", gap: "9px", alignItems: "flex-end", flexDirection: isBot ? "row" : "row-reverse" }}>
      <div style={{ width: "29px", height: "29px", minWidth: "29px", borderRadius: "50%", background: isBot ? "var(--primary)" : "var(--navy-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {isBot ? <Bot size={14} color="white" /> : <User size={14} color="white" />}
      </div>
      <div style={{
        maxWidth: "80%", padding: "9px 13px",
        borderRadius: isBot ? "14px 14px 14px 3px" : "14px 14px 3px 14px",
        background: isBot ? "var(--surface)" : "var(--navy-light)",
        color: isBot ? "var(--text-primary)" : "#fff",
        border: isBot ? "1px solid var(--border)" : "none",
        fontSize: "14px", lineHeight: "1.55",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {content}
      </div>
    </div>
  );
}

/* ── The actual chat panel ─────────────────────────────────────────── */
export function ChatPanel({ onClose, compact = false }) {
  const { t } = useLanguage();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (messages.length === 0 && !isLoading) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const fillPrompt = (p) => { setInput(p); inputRef.current?.focus(); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className={compact ? "chat-panel chat-panel-compact" : "chat-panel"}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "11px", background: "var(--surface)", flexShrink: 0 }}>
        <div style={{ width: "38px", height: "38px", borderRadius: "9px", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
          <MessageSquare size={17} color="white" />
          <div style={{ position: "absolute", bottom: "2px", right: "2px", width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a", border: "2px solid var(--surface)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>{t.chatTitle}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{t.chatSubtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ padding: "2px 8px", borderRadius: "4px", background: "var(--success-light)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "12px", fontWeight: 700, color: "var(--success)" }}>
            CIVIC INFO
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close chat"
              style={{ width: "28px", height: "28px", borderRadius: "7px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} id="chat-messages" className="chat-messages">
        <Bubble msg={WELCOME} />
        {messages.length === 0 && (
          <div className="chat-suggestions" aria-label="Suggested questions">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => fillPrompt(prompt)} className="chat-suggestion">
                {prompt}
              </button>
            ))}
          </div>
        )}
        {messages.map(m => <Bubble key={m.id} msg={m} />)}
        {isLoading && <TypingDots />}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", alignItems: "flex-end", background: "var(--surface)", flexShrink: 0 }}
      >
        <textarea
          ref={inputRef}
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
          placeholder={t.placeholder}
          rows={1}
          className="civic-input"
          style={{ flex: 1, resize: "none", maxHeight: "90px", overflowY: "auto", lineHeight: "1.5" }}
        />
        <button
          id="chat-send"
          type="submit"
          aria-label={t.send}
          disabled={isLoading || !input?.trim()}
          style={{ width: "38px", height: "38px", borderRadius: "8px", border: "none", background: isLoading || !input?.trim() ? "var(--muted-bg)" : "var(--primary)", color: isLoading || !input?.trim() ? "var(--text-muted)" : "white", cursor: isLoading || !input?.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
        >
          <Send size={15} />
        </button>
      </form>

      <style>{`@keyframes bounceDot { 0%,80%,100%{transform:scale(0);opacity:.4}40%{transform:scale(1);opacity:1} }`}</style>
    </div>
  );
}

/* ── Desktop sidebar wrapper ───────────────────────────────────────── */
export function ChatSidebar({ compact = false }) {
  return (
    <div className={compact ? "chat-sidebar chat-sidebar-compact" : "chat-sidebar"}>
      <ChatPanel compact={compact} />
    </div>
  );
}

/* ── Mobile floating button + full-screen modal ────────────────────── */
export function ChatFloating() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          id="chat-float-btn"
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: "24px", right: "24px", zIndex: 50,
            width: "56px", height: "56px", borderRadius: "50%",
            background: "var(--primary)", /* Saffron accent */
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(234,88,12,0.45)",
            transition: "transform 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          aria-label="Open Chunav Saathi chat"
        >
          <MessageSquare size={24} color="white" />
        </button>
      )}

      {/* Full-screen chat modal on mobile */}
      {open && (
        <div
          className="fade-in-up"
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "var(--background)",
            display: "flex", flexDirection: "column",
          }}
        >
          <ChatPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
