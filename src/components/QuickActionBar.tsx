import { motion } from "framer-motion";
import { Zap, FileText, HelpCircle, User, BookOpen, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionBarProps {
  onAskQuestion: () => void;
  onFocusRevenue: () => void;
  onScrollToAccount: () => void;
  onScrollToInspiration: () => void;
  onStartTour: () => void;
}

const allActions = [
  { icon: User, label: "Account", action: "account" },
  { icon: BookOpen, label: "Inspiration", action: "inspiration" },
  { icon: FileText, label: "Auszahlung", action: "invoice" },
  { icon: Zap, label: "Bestenliste", action: "leaderboard" },
  { icon: HelpCircle, label: "Ich habe eine Frage", action: "question" },
  { icon: Eye, label: "Tour", action: "tour" },
] as const;

export default function QuickActionBar({ onAskQuestion, onFocusRevenue, onScrollToAccount, onScrollToInspiration, onStartTour }: QuickActionBarProps) {
  const navigate = useNavigate();

  const handleAction = (action: string) => {
    switch (action) {
      case "account":
        onScrollToAccount();
        break;
      case "revenue":
        onFocusRevenue();
        break;
      case "inspiration":
        onScrollToInspiration();
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
      case "tour":
        onStartTour();
        break;
    }
  };

  return (
    <>
      {/* Desktop only: horizontal scroll */}
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
