import type { CandidateProfile } from "../types/matching";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { MatchBadge } from "./MatchBadge";
import { Tag } from "./Tag";

// SwipeCard is the presentational card rendered inside the Discover queue's
// SwipeDeck. It stays dumb on purpose: drag, fling, and swipe-state belong to
// SwipeDeck (task 12.1). This component just lays out the candidate's avatar,
// name, role-specific summary, skill tags, and the match-percentage badge.

export interface SwipeCardProps {
  candidate: CandidateProfile;
  className?: string;
}

// Cap visible tags so a candidate with a long skill list does not push the
// card out of the viewport on small screens.
const MAX_VISIBLE_TAGS = 6;

export function SwipeCard({ candidate, className }: SwipeCardProps) {
  const visibleTags = candidate.tags.slice(0, MAX_VISIBLE_TAGS);

  return (
    <Card className={className}>
      <div className="flex items-center gap-3">
        <Avatar name={candidate.displayName} size="lg" />
        <div className="ml-auto flex items-center gap-2">
          {candidate.verified ? <Badge tone="success">Verified</Badge> : null}
          <MatchBadge score={candidate.matchScore.value} />
        </div>
      </div>

      <h3 className="mt-3 text-xl font-semibold text-slate-900">
        {candidate.displayName}
      </h3>
      <p className="mt-1 text-sm text-slate-600">{candidate.summary}</p>

      {visibleTags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {visibleTags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
