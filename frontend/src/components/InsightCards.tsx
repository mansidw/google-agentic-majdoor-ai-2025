import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, ShoppingCart, Calendar, AlertCircle, Wallet, BarChart3 } from "lucide-react";

export const InsightCards = () => {
  const insights = [
    {
      icon: TrendingUp,
      title: "Weekly Spending Up 15%",
      description: "You spent $127 more this week compared to last week",
      category: "Trending",
      color: "text-info",
      bgColor: "bg-info/10",
      action: "View Details"
    },
    {
      icon: ShoppingCart,
      title: "Top Category: Groceries",
      description: "72% of your spending this month went to grocery stores",
      category: "Category",
      color: "text-primary",
      bgColor: "bg-primary/10",
      action: "Create Grocery Pass"
    },
    {
      icon: Calendar,
      title: "Monthly Budget Alert",
      description: "You've used 85% of your $500 monthly grocery budget",
      category: "Budget",
      color: "text-warning",
      bgColor: "bg-warning/10",
      action: "Adjust Budget"
    },
    {
      icon: AlertCircle,
      title: "Subscription Detected",
      description: "Netflix charge detected - would you like to track subscriptions?",
      category: "Alert",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      action: "Track Subscriptions"
    },
    {
      title: "Smart Categorization",
      description: "Automatically categorize your expenses with AI.",
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary/10",
      category: "AI",
      action: "Learn More"
    }
  ];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">AI Insights</h2>
        <Button variant="ghost" size="sm">View All</Button>
      </div>

      <div className="grid gap-4">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon;
          return (
            <Card 
              key={index}
              className="p-4 animate-fade-in bg-card border-0 shadow-card hover:shadow-elevated transition-shadow"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${insight.bgColor}`}>
                  <IconComponent className={`h-5 w-5 ${insight.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-card-foreground truncate">{insight.title}</h3>
                    <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                      {insight.category}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {insight.description}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      {insight.action}
                    </Button>
                    <Button size="sm" className="text-xs bg-primary text-white border-primary hover:bg-white hover:text-primary hover:border-primary">
                      <Wallet className="h-3 w-3 mr-1" />
                      Add to Wallet
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};