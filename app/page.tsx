"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Variants, type Transition } from "motion/react";

interface Job {
  id?: string;
  title?: string;
  company?: string;
  location?: string;
  via?: string;
  description?: string;
  highlights?: {
    Qualifications?: string[];
    Responsibilities?: string[];
    Benefits?: string[];
  };
  salary?: string;
  experience?: string;
  jobType?: string;
  workFromHome?: boolean;
  scheduleType?: string;
  applyLink?: string;
  postedAt?: string;
}

interface ApiResponse {
  success: boolean;
  query: string;
  count: number;
  jobs: Job[];
  error?: string;
}

interface AnalysisResult {
  matchScore: number;
  recommendation: string;
  matchingSkills: string[];
  missingSkills: string[];
  whyApply: string;
  whySkip: string;
  interviewQuestions: string[];
  prepPlan: string[];
}

interface UserProfile {
  role: string;
  experience: string;
  skills: string;
}

interface JobAnalysisState {
  [jobId: string]: {
    analysis: AnalysisResult | null;
    isAnalyzing: boolean;
    error: string | null;
  };
}

const springTransition = (delay = 0): Transition => ({
  type: "spring",
  stiffness: 100,
  damping: 15,
  delay,
});

const CONTAINER_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

const CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 18 },
  },
  hover: { y: -4, scale: 1.01, transition: { duration: 0.2 } },
};

const BUTTON_HOVER = { scale: 1.02, transition: { duration: 0.15 } };
const BUTTON_TAP = { scale: 0.98, transition: { duration: 0.1 } };

const SCORE_VARIANTS: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200, damping: 20 } },
};

const SKILL_VARIANTS: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 150, damping: 20, delay: i * 0.04 },
  }),
};

const QUESTION_VARIANTS: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: springTransition(i * 0.06),
  }),
};

const STEP_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: springTransition(i * 0.08),
  }),
};

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Excellent match", color: "text-emerald-600 dark:text-emerald-400" };
  if (score >= 75) return { label: "Strong match", color: "text-green-600 dark:text-green-400" };
  if (score >= 50) return { label: "Moderate match", color: "text-amber-600 dark:text-amber-400" };
  return { label: "Low match", color: "text-red-600 dark:text-red-400" };
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-green-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getRecommendationColor(rec: string): string {
  switch (rec) {
    case "Highly Recommended":
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "Recommended":
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "Consider":
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "Not Recommended":
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
    default:
      return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
  }
}

function LoadingSpinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <motion.svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </motion.svg>
  );
}

function PulsingDots({ className = "" }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <motion.span
        className="inline-block mx-0.5"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      >
        ●
      </motion.span>
      <motion.span
        className="inline-block mx-0.5"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
      >
        ●
      </motion.span>
      <motion.span
        className="inline-block mx-0.5"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
      >
        ●
      </motion.span>
    </span>
  );
}

function ScoreCounter({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;
    setHasAnimated(true);
    const duration = 800;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(score * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score, hasAnimated]);

  return <span className="text-3xl font-bold tabular-nums">{displayScore}</span>;
}

function AILoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 p-8"
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-3 border-purple-200 dark:border-purple-800" />
        <motion.div
          className="absolute inset-0 w-16 h-16 rounded-full border-3 border-purple-500 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium text-zinc-900 dark:text-white">Analyzing with AI</p>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Comparing your profile with this job</p>
        <PulsingDots className="mt-3" />
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      <motion.div
        className="mx-auto w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-6"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <svg className="w-10 h-10 text-zinc-400 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </motion.div>
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">No jobs found</h3>
      <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-6">
        Try adjusting your search criteria to find more opportunities.
      </p>
      <ul className="text-left max-w-xs mx-auto text-zinc-600 dark:text-zinc-400 space-y-2">
        <li className="flex items-center gap-2">• Try a broader role title</li>
        <li className="flex items-center gap-2">• Use a larger location area</li>
        <li className="flex items-center gap-2">• Reduce the number of required skills</li>
        <li className="flex items-center gap-2">• Adjust experience level</li>
      </ul>
    </motion.div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400"
      role="alert"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium">Analysis unavailable</p>
        <motion.button
          whileHover={BUTTON_HOVER}
          whileTap={BUTTON_TAP}
          onClick={onRetry}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry Analysis
        </motion.button>
      </div>
      <p className="mt-1 text-sm">{message}</p>
    </motion.div>
  );
}

function MatchScoreDisplay({ score }: { score: number }) {
  const { label, color } = getScoreLabel(score);
  const progressColor = getScoreColor(score);

  return (
    <motion.div
      variants={SCORE_VARIANTS}
      initial="initial"
      animate="animate"
      className="flex flex-col items-center gap-2 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700"
    >
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            className="text-zinc-200 dark:text-zinc-700"
            strokeWidth="6"
            stroke="currentColor"
            fill="transparent"
            r="44"
            cx="48"
            cy="48"
          />
          <motion.circle
            className={progressColor}
            strokeWidth="6"
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="44"
            cx="48"
            cy="48"
            strokeDasharray={276.46}
            initial={{ strokeDashoffset: 276.46 }}
            animate={{ strokeDashoffset: 276.46 * (1 - score / 100) }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <ScoreCounter score={score} />
        </div>
      </div>
      <div className="text-center">
        <p className={`text-sm font-medium ${color}`}>{label}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{score}/100 match</p>
      </div>
    </motion.div>
  );
}

function SkillBadges({ skills, type }: { skills: string[]; type: "matching" | "missing" }) {
  if (skills.length === 0) return null;

  return (
    <motion.div
      layout
      className="flex flex-wrap gap-2"
      role="list"
      aria-label={type === "matching" ? "Matching skills" : "Missing skills"}
    >
      {skills.map((skill, i) => (
        <motion.span
          key={skill}
          variants={SKILL_VARIANTS}
          custom={i}
          initial="hidden"
          animate="visible"
          className={`px-3 py-1.5 text-sm font-medium rounded-full border ${
            type === "matching"
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
          }`}
          role="listitem"
        >
          {skill}
        </motion.span>
      ))}
    </motion.div>
  );
}

interface AnalysisDisplayProps {
  analysis: AnalysisResult;
}

function AnalysisDisplay({ analysis }: AnalysisDisplayProps) {
  const { matchScore, recommendation, matchingSkills, missingSkills, whyApply, whySkip, interviewQuestions, prepPlan } = analysis;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h4 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          AI Match Analysis
        </h4>
        <MatchScoreDisplay score={matchScore} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex items-center gap-3 flex-wrap"
      >
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getRecommendationColor(recommendation)}`}>
          {recommendation}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <h5 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Why Apply
        </h5>
        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{whyApply}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <h5 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Matching Skills ({matchingSkills.length})
        </h5>
        <SkillBadges skills={matchingSkills} type="matching" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
      >
        <h5 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Missing Skills ({missingSkills.length})
        </h5>
        <SkillBadges skills={missingSkills} type="missing" />
      </motion.div>

      {whySkip && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <h5 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Considerations
          </h5>
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{whySkip}</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
      >
        <h5 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Interview Questions
        </h5>
        <ol className="space-y-3">
          {interviewQuestions.map((q, i) => (
            <motion.li
              key={i}
              variants={QUESTION_VARIANTS}
              custom={i}
              initial="hidden"
              animate="visible"
              className="text-zinc-700 dark:text-zinc-300 leading-relaxed"
            >
              <span className="font-medium text-zinc-900 dark:text-white mr-2">{i + 1}.</span>
              {q}
            </motion.li>
          ))}
        </ol>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <h5 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Preparation Plan
        </h5>
        <ol className="space-y-3">
          {prepPlan.map((step, i) => (
            <motion.li
              key={i}
              variants={STEP_VARIANTS}
              custom={i}
              initial="hidden"
              animate="visible"
              className="flex gap-3 text-zinc-700 dark:text-zinc-300 leading-relaxed"
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span>{step}</span>
            </motion.li>
          ))}
        </ol>
      </motion.div>
    </motion.div>
  );
}

interface JobCardProps {
  job: Job;
  index: number;
  jobKey: string;
  profile: UserProfile;
  analysis: { analysis: AnalysisResult | null; isAnalyzing: boolean; error: string | null } | undefined;
  onAnalyze: (job: Job, jobKey: string) => void;
}

function JobCard({ job, index, jobKey, profile, analysis, onAnalyze }: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const jobAnalysis = analysis || { analysis: null, isAnalyzing: false, error: null };
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const cardVariants = prefersReducedMotion ? {} : CARD_VARIANTS;

  return (
    <motion.article
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={prefersReducedMotion ? {} : "hover"}
      className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">#{index + 1}</span>
              {job.via && (
                <span className="px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                  {job.via}
                </span>
              )}
              {job.workFromHome && (
                <span className="px-2 py-0.5 text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Remote
                </span>
              )}
            </div>
            <h4 className="text-xl font-semibold text-zinc-900 dark:text-white mb-1 line-clamp-1">
              {job.title || "Untitled Position"}
            </h4>
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">{job.company || "Unknown Company"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            {job.location && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {job.location}
              </span>
            )}
            {job.salary && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {job.salary}
              </span>
            )}
            {job.experience && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {job.experience}
              </span>
            )}
            {job.jobType && (
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
                {job.jobType}
              </span>
            )}
          </div>
        </div>

        {job.description && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
            {job.description}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <motion.button
            whileHover={BUTTON_HOVER}
            whileTap={BUTTON_TAP}
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {isExpanded ? "Show Less" : "Show Details"}
          </motion.button>
          {job.applyLink && (
            <motion.a
              whileHover={BUTTON_HOVER}
              whileTap={BUTTON_TAP}
              href={job.applyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Job
            </motion.a>
          )}
          <motion.button
            whileHover={BUTTON_HOVER}
            whileTap={BUTTON_TAP}
            onClick={() => onAnalyze(job, jobKey)}
            disabled={jobAnalysis.isAnalyzing || !profile.role.trim()}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            aria-label={jobAnalysis.isAnalyzing ? "Analyzing with AI" : jobAnalysis.analysis ? "View Analysis" : "Analyze Match"}
          >
            {jobAnalysis.isAnalyzing ? (
              <>
                <LoadingSpinner size={16} />
                Analyzing with AI
              </>
            ) : jobAnalysis.analysis ? (
              "View Analysis"
            ) : (
              "Analyze Match"
            )}
          </motion.button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800"
            >
              <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
                {jobAnalysis.error && (
                  <ErrorState
                    message={jobAnalysis.error}
                    onRetry={() => onAnalyze(job, jobKey)}
                  />
                )}

                {jobAnalysis.analysis && (
                  <AnalysisDisplay analysis={jobAnalysis.analysis} />
                )}

                {job.description && job.description.length > 200 && (
                  <div>
                    <h5 className="font-semibold text-zinc-900 dark:text-white mb-2">Full Description</h5>
                    <p className="prose prose-sm dark:prose-invert max-w-none">{job.description}</p>
                  </div>
                )}

                {job.highlights && (
                  <>
                    {job.highlights.Qualifications && job.highlights.Qualifications.length > 3 && (
                      <div>
                        <h5 className="font-semibold text-zinc-900 dark:text-white mb-2">All Qualifications</h5>
                        <ul className="space-y-1 list-disc list-inside text-zinc-600 dark:text-zinc-400">
                          {job.highlights.Qualifications.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {job.highlights.Responsibilities && job.highlights.Responsibilities.length > 3 && (
                      <div>
                        <h5 className="font-semibold text-zinc-900 dark:text-white mb-2">All Responsibilities</h5>
                        <ul className="space-y-1 list-disc list-inside text-zinc-600 dark:text-zinc-400">
                          {job.highlights.Responsibilities.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {job.highlights.Benefits && job.highlights.Benefits.length > 3 && (
                      <div>
                        <h5 className="font-semibold text-zinc-900 dark:text-white mb-2">All Benefits</h5>
                        <ul className="space-y-1 list-disc list-inside text-zinc-600 dark:text-zinc-400">
                          {job.highlights.Benefits.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {job.postedAt && (
                  <p className="text-zinc-500 dark:text-zinc-500">
                    Posted: {job.postedAt}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}

export default function Home() {
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [jobAnalyses, setJobAnalyses] = useState<JobAnalysisState>({});
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isResultsVisible, setIsResultsVisible] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setIsResultsVisible(false);

    const params = new URLSearchParams();
    if (role) params.set("q", role);
    if (location) params.set("location", location);
    if (experience) params.set("experience", experience);
    if (skills) params.set("skills", skills);

    try {
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data: ApiResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch jobs");
      }

      setJobs(data.jobs);
      setSearchQuery(data.query);
      setJobAnalyses({});
      setIsResultsVisible(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setJobs([]);
      setIsResultsVisible(false);
    } finally {
      setIsLoading(false);
    }
  }, [role, location, experience, skills]);

  const handleAnalyze = useCallback(async (job: Job, jobKey: string) => {
    const profile: UserProfile = {
      role,
      experience,
      skills,
    };

    setJobAnalyses(prev => ({
      ...prev,
      [jobKey]: {
        analysis: null,
        isAnalyzing: true,
        error: null,
      },
    }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, job }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setJobAnalyses(prev => ({
        ...prev,
        [jobKey]: {
          analysis: data.analysis,
          isAnalyzing: false,
          error: null,
        },
      }));
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        setJobAnalyses(prev => ({
          ...prev,
          [jobKey]: {
            analysis: null,
            isAnalyzing: false,
            error: "Request timed out. Please try again.",
          },
        }));
      } else {
        setJobAnalyses(prev => ({
          ...prev,
          [jobKey]: {
            analysis: null,
            isAnalyzing: false,
            error: err instanceof Error ? err.message : "Analysis failed",
          },
        }));
      }
    }
  }, [role, experience, skills]);

  const getJobKey = useCallback((job: Job, index: number) => {
    return job.id || `job-${index}`;
  }, []);

  const initialVariants: Variants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { type: "spring", stiffness: 80, damping: 20 },
        },
      };

  const formVariants: Variants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { type: "spring", stiffness: 80, damping: 20, delay: 0.1 },
        },
      };

  return (
    <motion.div
      className="min-h-screen bg-zinc-50 dark:bg-zinc-950"
      initial={prefersReducedMotion ? {} : { opacity: 0 }}
      animate={prefersReducedMotion ? {} : { opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.header
        variants={initialVariants}
        initial="hidden"
        animate="visible"
        className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10"
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 10a3 3 0 013-3" />
              </svg>
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">JobRadar AI</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Find the right developer jobs. Know why you match.</p>
            </div>
          </div>
          <motion.span
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="px-3 py-1 text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-800"
          >
            Powered by SerpApi + NVIDIA Nemotron
          </motion.span>
        </div>
      </motion.header>

      <motion.main
        variants={formVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto px-4 py-10 sm:py-12 flex-1"
      >
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center mb-10"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white mb-4 tracking-tight">
            Find jobs that actually fit you.
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Search live Google Jobs and get AI-powered match analysis, skill gaps, and interview prep — all in one place.
          </p>
        </motion.section>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm mb-10"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Role <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Software Engineer"
                className="w-full px-4 py-3.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                required
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Location
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Bangalore"
                className="w-full px-4 py-3.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="experience" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Experience
              </label>
              <input
                id="experience"
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g., 0–2 years"
                className="w-full px-4 py-3.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Skills
              </label>
              <input
                id="skills"
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g., Java, React, SQL"
                className="w-full px-4 py-3.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                autoComplete="off"
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="flex justify-center"
          >
            <motion.button
              type="submit"
              disabled={isLoading || !role.trim()}
              whileHover={!isLoading ? BUTTON_HOVER : undefined}
              whileTap={!isLoading ? BUTTON_TAP : undefined}
              className="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/25"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size={20} className="text-white" />
                  Searching jobs...
                </span>
              ) : (
                "Find Jobs"
              )}
            </motion.button>
          </motion.div>
        </motion.form>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-3"
              role="alert"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>{error}</p>
            </motion.div>
          )}

          {searchQuery && jobs.length === 0 && !isLoading && !error && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState />
            </motion.div>
          )}

          {jobs.length > 0 && (
            <motion.section
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
              >
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                    <span className="text-purple-600 dark:text-purple-400">{jobs.length}</span> Job{jobs.length !== 1 ? "s" : ""} Found
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-1">Based on your profile and preferences</p>
                </div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                  Query: "{searchQuery}"
                </span>
              </motion.div>

              <motion.div
                variants={CONTAINER_VARIANTS}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {jobs.map((job, index) => (
                  <JobCard
                    key={job.id || index}
                    job={job}
                    index={index}
                    jobKey={getJobKey(job, index)}
                    profile={{ role, experience, skills }}
                    analysis={jobAnalyses[getJobKey(job, index)]}
                    onAnalyze={handleAnalyze}
                  />
                ))}
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </motion.main>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-8 mt-auto"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="font-semibold text-zinc-900 dark:text-white">JobRadar AI</span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Built for SerpApi India Hackathon 2026
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Powered by SerpApi Google Jobs + NVIDIA Nemotron
            </p>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  );
}