import { useEffect } from "react";
import { useMotionValue, useTransform, animate, motion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
}

export default function AnimatedNumber({ value, duration = 1.1, className, suffix = "" }: AnimatedNumberProps) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) =>
    Math.round(v).toLocaleString("de-DE")
  );

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.22, 1, 0.36, 1], // smooth easeOutQuart-ish
    });
    return controls.stop;
  }, [value, duration, motionValue]);

  return (
    <motion.span className={className} style={{ fontVariantNumeric: "tabular-nums", display: "inline-block" }}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </motion.span>
  );
}
