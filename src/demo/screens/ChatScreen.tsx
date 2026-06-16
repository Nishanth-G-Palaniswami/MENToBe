import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";

import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { useDemo } from "../DemoProvider";
import { headlineFor, nameFor, profileById } from "../data";
import type { Message, MessageThread } from "../../types/messaging";
import type { ThreadId } from "../../types/identity";

const PROMPTS = [
  "Share your goals for the next 3 months",
  "Ask about their industry",
  "Request portfolio feedback",
];

// Chat thread for a match. Uses the messaging mock's pub/sub so optimistic
// sends render immediately and stay in sync.
export function ChatScreen() {
  const { matchId = "" } = useParams();
  const navigate = useNavigate();
  const { messaging, matches, viewerId } = useDemo();

  const [thread, setThread] = useState<MessageThread | null>(null);
  const [body, setBody] = useState("");
  const threadIdRef = useRef<ThreadId | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const match = matches.find((m) => m.id === matchId);
  const partnerId = match?.userIds.find((u) => u !== viewerId) ?? "";
  const partner = profileById(partnerId);

  useEffect(() => {
    if (!match) return;
    let unsub = () => {};
    (async () => {
      const t = await messaging.loadThread(match.id);
      threadIdRef.current = t.id;
      setThread(t);
      unsub = messaging.subscribe(t.id, (next) => setThread(next));
    })();
    return () => unsub();
  }, [match, messaging]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length]);

  async function send(text: string) {
    const trimmed = text.trim();
    const threadId = threadIdRef.current;
    if (!trimmed || !threadId) return;
    setBody("");
    await messaging.sendMessage(threadId, viewerId, trimmed);
  }

  if (!match) {
    return (
      <div className="mx-auto max-w-md px-5 py-10">
        <p className="text-sm text-slate-500">Conversation not found.</p>
        <Button className="mt-4" onClick={() => navigate("/matches")}>
          Back to connections
        </Button>
      </div>
    );
  }

  const messages = thread?.messages ?? [];

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => navigate("/matches")}
          aria-label="Back"
          className="text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name={nameFor(partnerId)} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">
            {nameFor(partnerId)}
          </p>
          <p className="truncate text-xs text-slate-500">
            {partner ? headlineFor(partner) : ""}
          </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="pt-6">
            <p className="mb-3 text-center text-xs text-slate-400">
              Break the ice — try a conversation starter
            </p>
            <div className="space-y-2">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setBody(p)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-700 hover:border-primary/40"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} mine={m.senderId === viewerId} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(body);
        }}
        className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <Button type="submit" size="sm" disabled={!body.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function Bubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
          mine
            ? "rounded-br-sm bg-primary text-white"
            : "rounded-bl-sm bg-slate-100 text-slate-800"
        }`}
      >
        {message.body}
      </div>
    </div>
  );
}
