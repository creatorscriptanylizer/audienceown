import { Sparkles } from "lucide-react";

export function AiRecommendation({ children }: { children: React.ReactNode }) {
  return <span className="ai-recommendation" aria-label="AI recommendation">
    <span className="ai-recommendation-label"><Sparkles size={13} aria-hidden/>AI recommendation</span>
    <span className="ai-recommendation-copy">{children}</span>
  </span>;
}
