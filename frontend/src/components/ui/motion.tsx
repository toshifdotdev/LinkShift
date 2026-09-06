import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";



const EASE = [0.22, 1, 0.36, 1] as const;

const riseVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};


function FadeIn({
  children,
  delay = 0,
  duration = 0.24,
  y = 8,
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}


function Stagger({
  children,
  delay = 0,
  step = 0.05,
  className,
  itemClassName,
}: {
  children: ReactNode[];
  delay?: number;
  step?: number;
  className?: string;
  itemClassName?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className}>
        {children.map((c, i) => (
          <div key={i} className={itemClassName}>
            {c}
          </div>
        ))}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { delayChildren: delay, staggerChildren: step } },
      }}
    >
      {children.map((c, i) => (
        <motion.div key={i} className={itemClassName} variants={riseVariants}>
          {c}
        </motion.div>
      ))}
    </motion.div>
  );
}


function Spine({
  active,
  className,
  orientation = "vertical",
}: {
  active: boolean;
  className?: string;
  orientation?: "vertical" | "horizontal";
}) {
  return (
    <span
      aria-hidden="true"
      className={
        "pointer-events-none absolute bg-brand transition-transform duration-300 ease-out " +
        (orientation === "vertical"
          ? "top-1.5 bottom-1.5 left-0 w-0.5 rounded-full " + (active ? "scale-y-100" : "scale-y-0")
          : "inset-x-0 top-0 h-0.5 rounded-full " + (active ? "scale-x-100" : "scale-x-0")) +
        " " + (className ?? "")
      }
    />
  );
}


function FlashSweep({ trigger, className }: { trigger: unknown; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("is-on");
    
    void el.offsetWidth;
    el.classList.add("is-on");
  }, [trigger]);
  return <span aria-hidden="true" ref={ref} className={"ls-stripe-draw " + (className ?? "")} />;
}


function NumberTick({
  value,
  active = true,
  duration = 700,
  className,
}: {
  value: number;
  active?: boolean;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    if (reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, active, duration, reduce]);

  return <span className={className}>{display.toLocaleString()}</span>;
}

export { FadeIn, Stagger, Spine, FlashSweep, NumberTick, EASE };
