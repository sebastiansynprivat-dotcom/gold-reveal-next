import { Check } from "lucide-react";

interface StepBadgeProps {
  step: number;
  completed?: boolean;
}

const StepBadge = ({ step, completed }: StepBadgeProps) => (
  <div
    className={`flex items-center justify-center w-9 h-9 rounded-full border-2 shrink-0 font-bold text-sm transition-all duration-300 ${
      completed
        ? "bg-primary border-primary text-primary-foreground"
        : "border-primary/40 text-primary/70 bg-primary/5"
    }`}
  >
    {completed ? <Check className="w-4 h-4" /> : step}
  </div>
);

export default StepBadge;
