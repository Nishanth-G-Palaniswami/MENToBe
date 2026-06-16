import { useNavigate } from "react-router-dom";
import { GraduationCap, Users } from "lucide-react";

import { Card } from "../../components/Card";
import { useDemo } from "../DemoProvider";
import type { Role } from "../../types/identity";

// Role selection. Picking a role routes into onboarding, where the user fills
// in their profile fields before entering the app.
export function RoleSelectScreen() {
  const { setRole } = useDemo();
  const navigate = useNavigate();

  function choose(role: Role) {
    setRole(role);
    navigate("/onboarding");
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">
        How do you want to start?
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        You can be both over time — pick where you are today.
      </p>

      <div className="mt-6 space-y-4">
        <button
          type="button"
          onClick={() => choose("mentee")}
          className="block w-full text-left disabled:opacity-60"
        >
          <Card className="transition-shadow hover:shadow-md">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  I'm a mentee
                </h2>
                <p className="text-sm text-slate-600">
                  Find mentors to learn from and grow your career.
                </p>
              </div>
            </div>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => choose("mentor")}
          className="block w-full text-left disabled:opacity-60"
        >
          <Card className="transition-shadow hover:shadow-md">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent">
                <Users className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  I'm a mentor
                </h2>
                <p className="text-sm text-slate-600">
                  Share your experience and guide mentees.
                </p>
              </div>
            </div>
          </Card>
        </button>
      </div>
    </div>
  );
}
