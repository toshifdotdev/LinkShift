import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789";


function useScramble(text: string, active: boolean, duration = 550): string {
  const reduce = useReducedMotion();
  
  const [frame, setFrame] = useState<string | null>(null);

  useEffect(() => {
    if (!active || reduce || !text) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const resolved = Math.floor(t * text.length);
      let out = text.slice(0, resolved);
      for (let i = resolved; i < text.length; i++) {
        out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
      setFrame(t < 1 ? out : text);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, active, duration, reduce]);

  if (!active) return "";
  if (reduce || !text) return text;
  return frame ?? "";
}

export { useScramble };
