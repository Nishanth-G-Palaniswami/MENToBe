import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { useDemo } from "../DemoProvider";
import { headlineFor, nameFor, profileById } from "../data";

// Connections list. Each match links to its chat thread.
export function MatchesScreen() {
  const { matches, viewerId } = useDemo();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-md px-5 pb-24 pt-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">
        Your connections
      </h1>

      {matches.length === 0 ? (
        <EmptyState
          title="No connections yet"
          description="Head to Discover and connect with people to start a conversation."
        />
      ) : (
        <ul className="space-y-2">
          {matches.map((m) => {
            const partnerId = m.userIds.find((u) => u !== viewerId) ?? "";
            const partner = profileById(partnerId);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/chat/${m.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-primary/40 hover:shadow-sm"
                >
                  <Avatar name={nameFor(partnerId)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {nameFor(partnerId)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {partner ? headlineFor(partner) : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-primary">
                    {m.matchScore}%
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
