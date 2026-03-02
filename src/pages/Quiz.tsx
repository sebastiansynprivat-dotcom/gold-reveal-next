import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { quizQuestions } from "@/data/quizQuestions";
import QuizStart from "@/components/QuizStart";
import QuizQuestion from "@/components/QuizQuestion";
import QuizResult from "@/components/QuizResult";

type QuizState = "start" | "playing" | "result";

const Quiz = () => {
  const [state, setState] = useState<QuizState>("start");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const handleStart = useCallback(() => {
    setState("playing");
    setCurrentIndex(0);
    setAnswers([]);
  }, []);

  const handleAnswer = useCallback((selectedIndex: number) => {
    setAnswers((prev) => [...prev, selectedIndex]);
    if (currentIndex + 1 < quizQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setState("result");
    }
  }, [currentIndex]);

  const handleRestart = useCallback(() => {
    setState("start");
    setCurrentIndex(0);
    setAnswers([]);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {state === "start" && <QuizStart key="start" onStart={handleStart} />}
        {state === "playing" && (
          <QuizQuestion
            key={`q-${currentIndex}`}
            question={quizQuestions[currentIndex]}
            currentIndex={currentIndex}
            totalQuestions={quizQuestions.length}
            onAnswer={handleAnswer}
          />
        )}
        {state === "result" && (
          <QuizResult key="result" questions={quizQuestions} answers={answers} onRestart={handleRestart} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Quiz;
