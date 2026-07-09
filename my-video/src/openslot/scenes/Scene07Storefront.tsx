import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FONT } from "../fonts";
import { clamp, COLORS, riseIn } from "../theme";
import { Eyebrow } from "../primitives";
import { PaymentsCards, StoreCard } from "../mocks";

const PRODUCTS = [
  { title: "Portfolio Review PDF", price: "₹499", kind: "doc" as const },
  { title: "Notion Template Pack", price: "₹1,999", kind: "template" as const },
  { title: "Recorded Workshop", price: "₹299", kind: "video" as const },
  { title: "Call + Playbook Bundle", price: "₹2,499", kind: "bundle" as const },
];

export const Scene07Storefront: React.FC = () => {
  const frame = useCurrentFrame();

  const storeOp = interpolate(frame, [0, 14, 122, 136], [0, 1, 1, 0], clamp);
  const payOp = interpolate(frame, [132, 148], [0, 1], clamp);
  const head = riseIn(frame, 8, 20, 22);
  const payHead = riseIn(frame, 140, 20, 22);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      {/* Storefront */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40, opacity: storeOp }}>
        <div style={{ ...head, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <Eyebrow text="Storefront" />
          <div style={{ fontFamily: FONT.sans, fontWeight: 800, fontSize: 60, letterSpacing: "-0.03em", color: COLORS.ink, textAlign: "center", lineHeight: 1.04 }}>
            Your booking page is<br />also your storefront
          </div>
        </div>
        <div style={{ display: "flex", gap: 22 }}>
          {PRODUCTS.map((p, i) => {
            const r = interpolate(frame, [30 + i * 8, 50 + i * 8], [0, 1], clamp);
            return (
              <div key={p.title} style={{ opacity: r, transform: `translateY(${(1 - r) * 24}px)` }}>
                <StoreCard {...p} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Payments */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40, opacity: payOp }}>
        <div style={{ ...payHead, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <Eyebrow text="Payments" />
          <div style={{ fontFamily: FONT.sans, fontWeight: 800, fontSize: 60, letterSpacing: "-0.03em", color: COLORS.ink, textAlign: "center", lineHeight: 1.04 }}>
            Get paid the way<br />India actually pays
          </div>
        </div>
        <PaymentsCards />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
