import { motion } from "framer-motion";
import { Zap, FileText, HelpCircle, Trophy, User, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionBarProps {
  onAskQuestion: () => void;
  onFocusRevenue: () => void;
  onScrollToAccount: () => void;
  onScrollToBonus: () => void;
}

const topActions = [
  { icon: User, label: "Account", action: "account" },
  { icon: Crown, label: "Bonus", action: "bonus" },
  { icon: FileText, label: "Auszahlung", action: "invoice" },
] as const;

const bottomActions = [
  { icon: Trophy, label: "Bestenliste", action: "leaderboard" },
  { icon: HelpCircle, label: "Ich habe eine Frage", action: "question" },
] as const;

const allActions = [...topActions, ...bottomActions];

export default function QuickActionBar({ onAskQuestion, onFocusRevenue, onScrollToAccount, onScrollToBonus }: QuickActionBarProps) {
  const navigate = useNavigate();

  const handleAction = (action: string) => {
    switch (action) {
      case "account":
        onScrollToAccount();
        break;
      case "revenue":
        onFocusRevenue();
        break;
      case "bonus":
        onScrollToBonus();
        break;
      case "invoice":
        navigate("/rechnung");
        break;
      case "leaderboard":
        navigate("/leaderboard");
        break;
      case "question":
        onAskQuestion();
        break;
    }
  };

  return (
    <>
      {/* Mobile: stacked rows */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex flex-col gap-1.5 md:hidden"
      >
        <div className="flex gap-1.5">
          {topActions.map(({ icon: Icon, label, action }) => (
            <button
              key={action}
              onClick={() => handleAction(action)}
              className="flex-1 flex items-center justify-center gap-1 rounded-full border border-border bg-secondary/60 py-1.5 text-[10px] font-medium text-foreground hover:border-accent/50 hover:bg-accent/10 hover:text-accent active:scale-95 transition-all"
            >
              <Icon className="h-3 w-3 shrink-0" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {bottomActions.map(({ icon: Icon, label, action }) => (
            <button
              key={action}
              onClick={() => handleAction(action)}
              className="flex-1 flex items-center justify-center gap-1 rounded-full border border-border bg-secondary/60 py-1.5 text-[10px] font-medium text-foreground hover:border-accent/50 hover:bg-accent/10 hover:text-accent active:scale-95 transition-all"
            >
              <Icon className="h-3 w-3 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Desktop: horizontal scroll */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="hidden md:flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
      >
        {allActions.map(({ icon: Icon, label, action }) => (
          <button
            key={action}
            onClick={() => handleAction(action)}
            className="flex items-center gap-1.5 shrink-0 rounded-full border border-border bg-secondary/60 px-3.5 py-1.5 text-xs font-medium text-foreground hover:border-accent/50 hover:bg-accent/10 hover:text-accent active:scale-95 transition-all"
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </motion.div>
    </>
  );
}
