// The HUD, as HTML over the scene:
//   top     a hint pill: tap the floor to feed the cat → tap the cat to pet it,
//           drag to turn; gone once you've done both
//   bottom  the model's credit (CC BY 4.0 asks for it)
// React state changes only when what's shown does.
import { useEffect, useState } from "react";
import { Html } from "@react-three/drei";

import { MODEL } from "./config";
import { catState } from "./state";

type Hint = { icon: string; text: string } | null;

const hintNow = (): Hint => {
  if (catState.fed === 0)
    return { icon: "🐟", text: "Tap the floor to feed the cat" };
  if (catState.pets === 0)
    return { icon: "🐱", text: "Tap the cat to pet it · drag to turn" };
  return null;
};

export const Hud = () => {
  const [hint, setHint] = useState<Hint>(hintNow);

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = hintNow();
      setHint((h) => (h?.text === next?.text ? h : next));
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Html fullscreen zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          fontFamily: '"Nunito", "Space Grotesk", system-ui, sans-serif',
        }}
      >
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            top: 18,
            left: "50%",
            transform: `translate(-50%, ${hint ? 0 : -10}px)`,
            opacity: hint ? 1 : 0,
            transition: "opacity 0.4s, transform 0.4s",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 18px",
            borderRadius: 999,
            background: "#fffdf5",
            border: "3px solid #4a7d32",
            boxShadow: "0 4px 0 #4a7d32",
            color: "#2f5a1f",
            fontSize: 16,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 22 }}>{hint?.icon}</span>
          <span>{hint?.text}</span>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 10,
            color: "rgba(255, 255, 255, 0.75)",
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.6)",
          }}
        >
          {MODEL.credit}
        </div>
      </div>
    </Html>
  );
};
