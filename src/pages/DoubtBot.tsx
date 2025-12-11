import { AIChatWindow } from '@/components/ai/AIChatWindow';

export default function DoubtBot() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
          Doubt Bot 💬
        </h1>
        <p className="text-muted-foreground mt-1">
          Get quick, concise answers to your questions
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <AIChatWindow
          title="Doubt Bot"
          subtitle="Quick Q&A Assistant"
          placeholder="Ask a quick question..."
          variant="doubt"
        />
      </div>
    </div>
  );
}
