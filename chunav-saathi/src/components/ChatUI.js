"use client";

import { useChat } from "@ai-sdk/react";
import { useLanguage } from "@/context/LanguageContext";
import { Send, Bot, User, MessageSquare, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const WELCOME = {
  id: "welcome",
  role: "assistant",
  content:
    "Namaste! 🙏 I am Chunav Saathi — your AI election companion. I can answer questions about voting, help you find polling booths, and analyze complaint data. Try asking me about election statistics!",
};

const QUICK_PROMPTS = [
  "Find polling booths in Karnataka",
  "Show complaint analytics",
  "What is an EPIC card?",
  "Election turnout data for Maharashtra",
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
        fontSize: "0.855rem", lineHeight: "1.65",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

/* ── The actual chat panel ─────────────────────────────────────────── */
export function ChatPanel({ onClose }) {
  const { t } = useLanguage();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    api: "/api/chat",
    initialMessages: [WELCOME],
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const fillPrompt = (p) => { setInput(p); inputRef.current?.focus(); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ content: input, role: "user" });
    setInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--surface)", borderRadius: "inherit", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "11px", background: "var(--surface)", flexShrink: 0 }}>
        <div style={{ width: "38px", height: "38px", borderRadius: "9px", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
          <MessageSquare size={17} color="white" />
          <div style={{ position: "absolute", bottom: "2px", right: "2px", width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a", border: "2px solid var(--surface)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>{t.chatTitle}</div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>{t.chatSubtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ padding: "2px 8px", borderRadius: "4px", background: "var(--success-light)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.62rem", fontWeight: 700, color: "var(--success)", letterSpacing: "0.04em" }}>
            ECI GUIDED
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{ width: "28px", height: "28px", borderRadius: "7px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} id="chat-messages" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "13px", background: "var(--background)" }}>
        {messages.map(m => <Bubble key={m.id} msg={m} />)}
        {isLoading && <TypingDots />}
      </div>

      {/* Quick prompts */}
      <div style={{ padding: "8px 14px 6px", display: "flex", gap: "5px", flexWrap: "wrap", borderTop: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
        {QUICK_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => fillPrompt(p)}
            style={{ padding: "3px 10px", borderRadius: "5px", fontSize: "0.67rem", fontWeight: 500, border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit", whiteSpace: "nowrap" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary-dark)"; e.currentTarget.style.background = "var(--primary-light)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "transparent"; }}
          >{p}</button>
        ))}
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
export function ChatSidebar() {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "12px", boxShadow: "var(--shadow-sm)", overflow: "hidden", height: "100%", minHeight: "560px" }}>
      <ChatPanel />
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
