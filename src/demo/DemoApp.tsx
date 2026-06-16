import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Compass, MessageCircle, User } from "lucide-react";

import { DemoProvider, useDemo } from "./DemoProvider";
import { AuthScreen } from "./screens/AuthScreen";
import { RoleSelectScreen } from "./screens/RoleSelectScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { DiscoverScreen } from "./screens/DiscoverScreen";
import { CandidateDetailScreen } from "./screens/CandidateDetailScreen";
import { MatchesScreen } from "./screens/MatchesScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { ProfileScreen } from "./screens/ProfileScreen";

// -----------------------------------------------------------------------------
// DemoApp — router + gates + bottom nav for the clickable demo.
// -----------------------------------------------------------------------------

// Full gate: signed in, role chosen, AND onboarding completed.
function RequireSession({ children }: { children: JSX.Element }) {
  const { session, onboarded } = useDemo();
  if (!session) return <Navigate to="/auth" replace />;
  if (!session.role) return <Navigate to="/auth/role" replace />;
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

// Onboarding gate: signed in with a role, but profile not yet completed.
function RequireRole({ children }: { children: JSX.Element }) {
  const { session, onboarded } = useDemo();
  if (!session) return <Navigate to="/auth" replace />;
  if (!session.role) return <Navigate to="/auth/role" replace />;
  if (onboarded) return <Navigate to="/discover" replace />;
  return children;
}

const NAV = [
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/matches", label: "Connections", icon: MessageCircle },
  { to: "/profile", label: "Profile", icon: User },
];

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, onboarded } = useDemo();

  // Hide chrome on auth/role/onboarding/chat (chat is full-screen).
  const path = location.pathname;
  const hidden =
    !session?.role ||
    !onboarded ||
    path.startsWith("/auth") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/chat");
  if (hidden) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md justify-around border-t border-slate-200 bg-white/95 py-2 backdrop-blur">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = path === to || path.startsWith(`${to}/`);
        return (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs ${
              active ? "text-primary" : "text-slate-400"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

function Shell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Routes>
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/auth/role" element={<RoleSelectScreen />} />
        <Route
          path="/onboarding"
          element={
            <RequireRole>
              <OnboardingScreen />
            </RequireRole>
          }
        />
        <Route
          path="/discover"
          element={
            <RequireSession>
              <DiscoverScreen />
            </RequireSession>
          }
        />
        <Route
          path="/discover/:userId"
          element={
            <RequireSession>
              <CandidateDetailScreen />
            </RequireSession>
          }
        />
        <Route
          path="/matches"
          element={
            <RequireSession>
              <MatchesScreen />
            </RequireSession>
          }
        />
        <Route
          path="/chat/:matchId"
          element={
            <RequireSession>
              <ChatScreen />
            </RequireSession>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireSession>
              <ProfileScreen />
            </RequireSession>
          }
        />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export function DemoApp() {
  return (
    <BrowserRouter>
      <DemoProvider>
        <Shell />
      </DemoProvider>
    </BrowserRouter>
  );
}
