import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import StepBadge from "./StepBadge";

interface Step {
  id: number;
  title: string;
}

interface ProgressChecklistProps {
  steps: Step[];
  completedSteps: Set<number>;
  onToggle: (id: number) => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

const ProgressChecklist = ({ steps, completedSteps, onToggle }: ProgressChecklistProps) => {
  const progress = (completedSteps.size / steps.length) * 100;
  const allDone = completedSteps.size === steps.length;

  return (
    <motion.div
      className="max-w-3xl mx-auto mb-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.8, ease }}
    >
      <div className="glass-card-subtle rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2
            className="gold-gradient-text text-lg font-bold"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Dein Fortschritt
          </h2>
          <span className="text-muted-foreground text-sm">
            {completedSteps.size} von {steps.length} erledigt
          </span>
        </div>

        {/* Progress Bar */}
        <Progress
          value={progress}
          className="h-2.5 mb-5 bg-secondary"
        />

        {/* Checklist */}
        <div className="space-y-2">
          {steps.map((step) => {
            const done = completedSteps.has(step.id);
            return (
              <label
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 hover:bg-primary/5 ${
                  done ? "opacity-60" : ""
                }`}
              >
                <Checkbox
                  checked={done}
                  onCheckedChange={() => onToggle(step.id)}
                  className="border-primary/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <StepBadge step={step.id} completed={done} />
                <span
                  className={`text-sm font-medium transition-all ${
                    done ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {step.title}
                </span>
              </label>
            );
          })}
        </div>

        {allDone && (
          <motion.p
            className="text-center text-primary font-semibold text-sm mt-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            🎉 Alle Schritte erledigt – super gemacht!
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};

export default ProgressChecklist;
