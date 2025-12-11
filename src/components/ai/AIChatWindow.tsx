import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AIMessage } from '@/types';

interface AIChatWindowProps {
  title: string;
  subtitle?: string;
  placeholder?: string;
  systemPrompt?: string;
  onSendMessage?: (message: string) => Promise<string>;
  initialMessages?: AIMessage[];
  variant?: 'tutor' | 'doubt' | 'notes';
}

export function AIChatWindow({
  title,
  subtitle,
  placeholder = 'Type your message...',
  onSendMessage,
  initialMessages = [],
  variant = 'tutor',
}: AIChatWindowProps) {
  const [messages, setMessages] = useState<AIMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI response (replace with actual API call)
      const response = await simulateAIResponse(input, variant);
      
      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border hero-gradient">
        <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-primary-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-primary-foreground/70">{subtitle}</p>}
        </div>
        <Sparkles className="w-5 h-5 text-primary-foreground/50 ml-auto animate-pulse" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl hero-gradient flex items-center justify-center mb-4 animate-pulse">
              <Bot className="w-8 h-8 text-primary-foreground" />
            </div>
            <h4 className="font-display font-semibold text-lg mb-2">
              {variant === 'tutor' && 'AI Tutor Ready'}
              {variant === 'doubt' && 'Quick Q&A Assistant'}
              {variant === 'notes' && 'Chat with Your Notes'}
            </h4>
            <p className="text-sm text-muted-foreground max-w-xs">
              {variant === 'tutor' && 'Ask me anything about your courses. I\'ll provide detailed explanations and practice questions.'}
              {variant === 'doubt' && 'Got a quick question? I\'ll give you concise, helpful answers.'}
              {variant === 'notes' && 'Select a note and ask questions. I\'ll find answers from your study materials.'}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 animate-slide-up',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className={cn(
                'text-[10px] mt-1',
                message.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'
              )}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 bg-background"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Simulated AI responses
async function simulateAIResponse(message: string, variant: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  const responses: Record<string, string[]> = {
    tutor: [
      "Great question! Let me explain this concept in detail.\n\n**Key Points:**\n1. First, understand the fundamental principle...\n2. Then, apply it to practical scenarios...\n3. Finally, test your understanding with exercises.\n\n**Practice Question:**\nCan you identify where this concept applies in real-world applications?",
      "I'd be happy to help you understand this better!\n\nThis topic relates to several core concepts:\n- Foundation theory\n- Practical applications\n- Common misconceptions\n\n**Tip:** Try working through example problems to reinforce your learning.\n\n**Practice Question:**\nWhat do you think would happen if we changed one of the variables?",
    ],
    doubt: [
      "Here's a quick answer:\n\n**Short explanation:** This works because of the underlying principle.\n\n**Steps:**\n1. Start here\n2. Apply the formula\n3. Check your result\n\nNeed more details?",
      "Quick answer:\n\nThe key thing to remember is the relationship between these elements. Focus on understanding the 'why' behind each step.\n\n**Remember:** Practice makes perfect!",
    ],
    notes: [
      "Based on your notes, I found relevant information:\n\n**From your notes:**\n> \"The concept demonstrates how...\" (Page 3)\n\n**Summary:**\nYour notes explain this as a fundamental principle that connects to the broader topic.\n\n**Source:** HTML Cheat Sheet, Section 2",
      "Found it in your uploaded materials!\n\n**Excerpt from notes:**\n> \"This technique is commonly used...\" \n\n**Additional context:**\nYour notes mention this relates to practical applications.\n\n**Source:** CSS Flexbox Guide",
    ],
  };

  const variantResponses = responses[variant] || responses.tutor;
  return variantResponses[Math.floor(Math.random() * variantResponses.length)];
}
