import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { AuthService } from "./auth/service";
import type { MatchingService } from "./matching/service";
import type { MessagingService } from "./messaging/service";
import type { NotesService } from "./notes/service";
import type { ProfileService } from "./profile/service";
import type { CalendarService } from "./calendar/service";
import type { PlanService } from "./plan/service";

// Aggregated service registry consumed by the application layer (hooks and
// screens) via `useServices()`. Field order mirrors the design's
// `serviceProvider` snippet so the contract stays grep-friendly across the
// design doc and the implementation.
//
// Backed by in-memory mocks for the MVP (Task 6) and swapped for HTTP
// adapters later by replacing the value passed to `<ServiceProvider>` in
// `App.tsx` (Task 17). Screens depend only on this aggregate, so the swap
// does not ripple beyond `App.tsx`.
export interface Services {
  auth: AuthService;
  matching: MatchingService;
  messaging: MessagingService;
  notes: NotesService;
  profile: ProfileService;
  calendar: CalendarService;
  plan: PlanService;
}

// `null` is the unprovided sentinel. `useServices()` distinguishes "no
// provider mounted" (programming error) from "provider supplied an empty
// registry" (impossible — `Services` has no optional fields).
export const ServiceContext = createContext<Services | null>(null);
ServiceContext.displayName = "ServiceContext";

interface ServiceProviderProps {
  value: Services;
  children: ReactNode;
}

// Thin wrapper around `ServiceContext.Provider`. Kept as a named function
// component so React DevTools shows `<ServiceProvider>` in the tree rather
// than a bare context provider node.
export function ServiceProvider({
  value,
  children,
}: ServiceProviderProps): JSX.Element {
  return (
    <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>
  );
}

// Runtime-checked accessor. Throwing on a missing provider catches the
// "rendered a screen outside `App.tsx`'s provider tree" mistake at the
// first hook call instead of letting `undefined.auth` blow up deep inside
// a query.
export function useServices(): Services {
  const services = useContext(ServiceContext);
  if (services === null) {
    throw new Error(
      "useServices() must be called inside a <ServiceProvider>. " +
        "Wrap your tree in <ServiceProvider value={services}> (see App.tsx).",
    );
  }
  return services;
}
