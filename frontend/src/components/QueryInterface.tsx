import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Mic, Globe, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const QueryInterface = () => {
  const [query, setQuery] = useState("");
  const [responses, setResponses] = useState<Array<{ query: string; response: string; language: string }>>([]);
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const currentQuery = query;
    setQuery("");

    // Mock AI response with language detection
    const mockResponses = {
      'क्या मेरे पास दाल है?': {
        response: "हाँ, आपने पिछले हफ्ते ₹85 की दाल खरीदी थी। यह आपकी खरीदारी सूची में है।",
        language: "Hindi"
      },
      'what did I spend on groceries?': {
        response: "You spent $342 on groceries this month, which is 45% of your total spending.",
        language: "English"
      },
      'default': {
        response: "Based on your receipts, I can help you track that item or spending category. Would you like me to create a pass for it?",
        language: "English"
      }
    };

    const response = mockResponses[currentQuery.toLowerCase() as keyof typeof mockResponses] || mockResponses.default;
    
    setTimeout(() => {
      setResponses(prev => [...prev, { 
        query: currentQuery, 
        response: response.response,
        language: response.language 
      }]);
    }, 1000);

    toast({
      title: "Processing Query",
      description: "Analyzing your question with AI...",
    });
  };

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    if (!isListening) {
      toast({
        title: "Voice Input",
        description: "Listening... Speak your question",
      });
      // Simulate voice input
      setTimeout(() => {
        setIsListening(false);
        setQuery("What did I spend on groceries this month?");
      }, 3000);
    }
  };

  const suggestedQueries = [
    "क्या मेरे पास दाल है?",
    "What did I spend on groceries?",
    "Show me this week's receipts",
    "¿Cuánto gasté en restaurantes?"
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
            />
            <Button 
              type="button" 
              variant="outline" 
              size="icon"
              onClick={handleVoiceInput}
              className={isListening ? "bg-destructive text-destructive-foreground" : ""}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
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
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Query Responses */}
      {responses.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Queries
          </h4>
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
                    <p className="text-sm text-card-foreground">{item.response}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        Detected: {item.language}
                      </span>
                      <Button size="sm" variant="outline" className="text-xs">
                        Create Pass
                      </Button>
                    </div>
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