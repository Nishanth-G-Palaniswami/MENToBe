import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useDemo } from "../DemoProvider";

// Demo login screen. Either path (Google or email) resolves to a signed-in
// session with no role yet, then routes to role selection.
export function AuthScreen() {
  const { signIn, signInWithGoogle } = useDemo();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  function go() {
    signIn(email.trim() || "demo.user@example.com");
    navigate("/auth/role");
  }

  function google() {
    signInWithGoogle();
    navigate("/auth/role");
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary">MENToBe</h1>
        <p className="mt-2 text-sm text-slate-600">
          Find the right mentor — or mentee — and grow together.
        </p>
      </div>

      <Card>
        <div className="mb-4 flex rounded-xl bg-slate-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-lg py-1.5 ${
              mode === "signin"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-lg py-1.5 ${
              mode === "signup"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500"
            }`}
          >
            Sign up
          </button>
        </div>

        <Button variant="secondary" className="w-full" onClick={google}>
          Continue with Google
        </Button>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </label>

        <Button className="mt-4 w-full" onClick={go}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </Card>

      <p className="mt-4 text-center text-xs text-slate-400">
        Demo mode — no real account is created.
      </p>
    </div>
  );
}
