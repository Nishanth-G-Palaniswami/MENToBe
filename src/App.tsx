import { DemoApp } from "./demo/DemoApp";

// The clickable phase-1 demo (login → role → discover → details → connect →
// chat → profile) lives entirely under src/demo/. Kiro's spec build-out of the
// real screens/hooks/routing (tasks 9–17) proceeds independently under
// src/screens, src/hooks, and src/routes; when task 17 lands, swap this mount
// for the real route table.
export default function App() {
  return <DemoApp />;
}
