import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Sheet } from "../../components/Sheet";
import { SwipeCard } from "../../components/SwipeCard";
import { useDemo } from "../DemoProvider";
import type { CandidateProfile } from "../../types/matching";

// Discover queue. Tap the card to see full details; Connect to match (subject
// to the free-tier cap) or Pass to skip.
export function DiscoverScreen() {
  const { loadQueue, connect, pass, matches, cap, session, upgrade } =
    useDemo();
  const navigate = useNavigate();

  const [queue, setQueue] = useState<CandidateProfile[]>([]);
  const [ready, setReady] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [capSheet, setCapSheet] = useState<{ cap: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = await loadQueue();
      if (!cancelled) {
        setQueue(q);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadQueue]);

  const top = queue[0];

  function advance() {
    setQueue((q) => q.slice(1));
  }

  async function onConnect() {
    if (!top) return;
    const outcome = await connect(top);
    if (outcome.kind === "match_created") {
      setCelebrate(top.displayName);
      advance();
    } else if (outcome.kind === "blocked_by_cap") {
      setCapSheet({ cap: outcome.cap });
    } else {
      advance();
    }
  }

  async function onPass() {
    if (!top) return;
    await pass(top);
    advance();
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-6">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
        <span>Discover {session?.role === "mentor" ? "mentees" : "mentors"}</span>
        <span>
          {matches.length}
          {Number.isFinite(cap) ? ` / ${cap}` : ""} connections
        </span>
      </div>

      <section className="min-h-[18rem]">
        {!ready ? (
          <p className="py-12 text-center text-sm text-slate-400">Loading…</p>
        ) : top ? (
          <button
            type="button"
            onClick={() => navigate(`/discover/${top.userId}`)}
            className="block w-full text-left"
            aria-label={`View ${top.displayName}'s profile`}
          >
            <SwipeCard candidate={top} />
            <p className="mt-2 text-center text-xs text-slate-400">
              Tap card for details
            </p>
          </button>
        ) : (
          <EmptyState
            title="You're all caught up"
            description="No more profiles in your queue right now. Broaden your preferences or check back later."
          />
        )}
      </section>

      {top ? (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button variant="secondary" size="lg" onClick={onPass}>
            ✕ Pass
          </Button>
          <Button size="lg" onClick={onConnect}>
            ♥ Connect
          </Button>
        </div>
      ) : null}

      {celebrate ? (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-md justify-center px-5">
          <button
            type="button"
            onClick={() => setCelebrate(null)}
            className="w-full rounded-xl bg-primary px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
          >
            ✨ It's a match with {celebrate}! Tap to dismiss
          </button>
        </div>
      ) : null}

      <Sheet
        open={capSheet !== null}
        onClose={() => setCapSheet(null)}
        title="Free plan limit reached"
      >
        <p className="text-sm text-slate-600">
          The free plan supports up to {capSheet?.cap} active connections.
          Upgrade to Premium to connect with unlimited {" "}
          {session?.role === "mentor" ? "mentees" : "mentors"}.
        </p>
        <div className="mt-4 flex gap-3">
          <Button variant="ghost" onClick={() => setCapSheet(null)}>
            Not now
          </Button>
          <Button
            onClick={() => {
              upgrade();
              setCapSheet(null);
            }}
          >
            Upgrade — $9.99/mo
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
