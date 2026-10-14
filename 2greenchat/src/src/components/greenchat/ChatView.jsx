import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatTime, initials, avatarStyle } from "@/lib/greenchat";

export default function ChatView({ chatId, title, subtitle, me, myUsername, participants, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  // Load existing messages for this conversation.
  useEffect(() => {
    let active = true;
    setLoading(true);
    base44.entities.ChatMessage.filter({ chat_id: chatId }, { sort: "created_date", limit: 200 })
      .then((page) => {
        if (active) {
          setMessages(page.items || []);
          setLoading(false);
        }
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [chatId]);

  // Real-time: subscribe to new messages in this chat.
  useEffect(() => {
    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      if (!event || !event.data) return;
      if (event.data.chat_id !== chatId) return;
      if (event.type === "create") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
      }
    });
    return unsubscribe;
  }, [chatId]);

  // Auto-scroll to newest message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    try {
      const created = await base44.entities.ChatMessage.create({
        chat_id: chatId,
        sender_id: me.id,
        sender_username: myUsername,
        text: trimmed,
        participants,
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === created.id)) return prev;
        return [...prev, created];
      });
    } catch (err) {
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="order-1 md:order-2 flex-1 flex flex-col h-full bg-background min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border bg-card shrink-0">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={avatarStyle(undefined)}
        >
          {initials(title)}
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-foreground truncate">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading && (
          <p className="text-center text-muted-foreground text-sm">Loading…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-8">
            No messages yet. Say hello 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me.id;
          return (
            <div
              key={m.id}
              className={"flex flex-col " + (mine ? "items-end" : "items-start")}
            >
              <div
                className={
                  "max-w-[80%] md:max-w-[70%] px-3.5 py-2 rounded-2xl " +
                  (mine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card text-card-foreground border border-border rounded-bl-sm")
                }
              >
                {!mine && (
                  <p className="text-xs font-semibold text-primary mb-0.5">
                    {m.sender_username}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">
                {formatTime(m.created_date)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="p-3 border-t border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 bg-background text-foreground placeholder:text-muted-foreground rounded-full px-4 py-2.5 outline-none border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="w-11 h-11 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
            aria-label="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}