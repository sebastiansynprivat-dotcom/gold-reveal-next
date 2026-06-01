import { motion } from "framer-motion";
import { FileText, HelpCircle, MessageSquare, BookOpen, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUILanguage } from "@/hooks/useUILanguage";

interface QuickActionBarProps {
  onAskQuestion: () => void;
  onFocusRevenue: () => void;
  onScrollToAccount: () => void;
  onScrollToInspiration: () => void;
  onStartTour: () => void;
}

export default function QuickActionBar({ onAskQuestion, onFocusRevenue, onScrollToAccount, onScrollToInspiration, onStartTour }: QuickActionBarProps) {
  const navigate = useNavigate();
  const { t } = useUILanguage();

  const allActions = [
    { icon: MessageSquare, label: t("quick.requests"), action: "account" },
    { icon: BookOpen, label: t("quick.inspiration"), action: "inspiration" },
    { icon: FileText, label: t("quick.invoice"), action: "invoice" },
    { icon: HelpCircle, label: t("quick.question"), action: "question" },
    { icon: Eye, label: t("quick.tour"), action: "tour" },
  ] as const;

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
