import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Mic, Globe, MessageSquare, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { chatService } from "@/services/chatService";
import { useAuthContext } from "@/contexts/AuthContext";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export const QueryInterface = () => {
  const [query, setQuery] = useState("");
  const [responses, setResponses] = useState<Array<{ query: string; response: string; rephrased_question?: string; timestamp: Date }>>([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthContext();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const currentQuery = query;
    setQuery("");
    setIsLoading(true);

    try {
      toast({
        title: "Processing Query",
        description: "Analyzing your question with AI...",
      });

      const result = await chatService.sendMessage(currentQuery, user?.uid);
      
      setResponses(prev => [...prev, { 
        query: currentQuery, 
        response: result.response,
        rephrased_question: result.rephrased_question,
        timestamp: new Date()
      }]);

      toast({
        title: "Response Received",
        description: "AI has analyzed your query successfully.",
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process your query. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (isLoading) return;
    
    setIsListening(!isListening);
    if (!isListening) {
      toast({
        title: "Voice Input",
        description: "Listening... Speak your question",
      });
      // Simulate voice input for demo purposes
      // In a real implementation, you would integrate with Web Speech API
      setTimeout(() => {
        setIsListening(false);
        setQuery("What did I spend on groceries this month?");
        toast({
          title: "Voice Captured",
          description: "Voice input converted to text",
        });
      }, 3000);
    }
  };

  const suggestedQueries = [
    "What did I spend on groceries this month?",
    "Show me my recent receipts",
    "क्या मेरे पास दाल है?",
    "Create a shopping list for me",
    "What offers are available for me?",
    "Analyze my spending patterns"
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="p-6 bg-card border-0 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Ask in Your Language</h3>
            <p className="text-sm text-muted-foreground">Get insights about your spending</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your receipts... (English, हिंदी, etc.)"
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              type="button" 
              variant="outline" 
              size="icon"
              onClick={handleVoiceInput}
              className={isListening ? "bg-destructive text-destructive-foreground" : ""}
              disabled={isLoading}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button type="submit" size="icon" className="bg-primary text-white border-primary hover:bg-white hover:text-primary hover:border-primary" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>

        {/* Suggested Queries */}
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQueries.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setQuery(suggestion)}
                className="text-xs"
                disabled={isLoading}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Query Responses */}
      {(responses.length > 0 || isLoading) && (
        <div className="space-y-4">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Queries
          </h4>
          
          {/* Loading indicator */}
          {isLoading && (
            <Card className="p-4 animate-fade-in bg-card border-0 shadow-card">
              <div className="flex items-center gap-3">
                <div className="p-1 bg-primary/10 rounded text-xs px-2 text-primary">
                  AI
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">Processing your query...</p>
                </div>
              </div>
            </Card>
          )}
          
          {responses.map((item, index) => (
            <Card key={index} className="p-4 animate-fade-in bg-card border-0 shadow-card">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-muted rounded text-xs px-2">
                    You
                  </div>
                  <p className="text-sm font-medium text-card-foreground">{item.query}</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-primary/10 rounded text-xs px-2 text-primary">
                    AI
                  </div>
                  <div className="flex-1">
                    <MarkdownRenderer content={item.response} />
                    <div className="flex items-center gap-2 mt-2">
                      {item.rephrased_question && (
                        <span className="text-xs text-muted-foreground">
                          Interpreted as: "{item.rephrased_question}"
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {item.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs mt-2">
                      Create Pass
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};