import { notFound } from "next/navigation";
import Preview from "./Preview";

// Dev-only gallery of every state the Glow-Up's live-openings section can be in.
// Reaching the real thing needs a paid Glow-Up plus live job results, which
// makes the empty, degraded and loading states almost impossible to eyeball
// during development — this renders all of them side by side from fixtures.
//
// 404s in production. The guard is a server component so the check happens
// before any of it is sent, and NODE_ENV is inlined at build time, so the
// preview is dead code in a production bundle rather than a hidden route.
export const dynamic = "force-static";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Preview />;
}
