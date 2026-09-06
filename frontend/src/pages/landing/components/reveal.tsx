import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

const riseVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};


function Reveal({
  children,
  delay = 0,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={riseVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-56px 0px -56px 0px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}


function MaskReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <span className={["block overflow-hidden", className].filter(Boolean).join(" ")}>
      <motion.span
        className="block will-change-transform"
        initial={reduce ? { opacity: 0 } : { y: "110%" }}
        animate={reduce ? { opacity: 1 } : { y: "0%" }}
        transition={{ duration: 0.7, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Kicker({ index, children }: { index?: string; children: string }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[11px] font-medium tracking-[0.18em] text-brand uppercase">
      <span className="h-px w-6 bg-brand/60" aria-hidden="true" />
      {index && <span className="text-fg-muted">{index}</span>}
      {children}
    </p>
  );
}

export { Reveal, MaskReveal, Kicker, EASE };
