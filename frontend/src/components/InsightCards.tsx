import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, ShoppingCart, Calendar, AlertCircle, Wallet, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

export const InsightCards = () => {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [walletLinks, setWalletLinks] = useState<{[key: number]: string}>({});
  const [walletLoading, setWalletLoading] = useState<{[key: number]: boolean}>({});
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const handleAddToWallet = async (insight: any, index: number) => {
    setWalletLoading(prev => ({ ...prev, [index]: true }));
    try {
      const payload = {
        type: insight.category.toLowerCase(),
        description: insight.description,
        details: insight.details || {}
      };
      const res = await axios.post(backendUrl + "/api/create-insight-pass", payload);
      if (res.data.saveUrl) {
        setWalletLinks(prev => ({ ...prev, [index]: res.data.saveUrl }));
        // Directly open the link in a new tab
        window.open(res.data.saveUrl, "_blank", "noopener,noreferrer");
      } else if (res.data.object_data && res.data.object_data.id) {
        setWalletLinks(prev => ({ ...prev, [index]: res.data.saveUrl || "" }));
        if (res.data.saveUrl) {
          window.open(res.data.saveUrl, "_blank", "noopener,noreferrer");
        }
      }
    } catch (err) {
      setWalletLinks(prev => ({ ...prev, [index]: "Error generating wallet link" }));
    } finally {
      setWalletLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  useEffect(() => {
    setLoading(true);
    axios.post(backendUrl + "/api/data-insights")
      .then(res => {
        // Transform API response to card format
        const data = res.data;
        const cards = [];
        if (data.weekly_spending_trend !== undefined && data.weekly_spending_trend !== null) {
          let trendText = "No change in weekly spending.";
          if (typeof data.weekly_spending_trend === "number") {
            if (data.weekly_spending_trend > 0) {
              trendText = `Spending increased by ${data.weekly_spending_trend.toFixed(1)}% compared to last week.`;
            } else if (data.weekly_spending_trend < 0) {
              trendText = `Spending decreased by ${Math.abs(data.weekly_spending_trend).toFixed(1)}% compared to last week.`;
            } else {
              trendText = "Spending is unchanged compared to last week.";
            }
          }
          cards.push({
            icon: TrendingUp,
            title: "Weekly Trend",
            description: trendText,
            category: "Weekly Trend",
            color: "text-info",
            bgColor: "bg-info/10",
            action: "View Details"
          });
        }
        if (data.expenditure) {
          cards.push({
            icon: TrendingUp,
            title: "Spending Tip",
            description: data.expenditure,
            category: "Trending",
            color: "text-info",
            bgColor: "bg-info/10",
            action: "View Details"
          });
        }
        if (data.perishables && Array.isArray(data.perishables)) {
          cards.push({
            icon: ShoppingCart,
            title: "Perishables Alert",
            description: data.perishables.join("; "),
            category: "Perishables",
            color: "text-warning",
            bgColor: "bg-warning/10",
            action: "View Details"
          });
        }
        if (data.health) {
          cards.push({
            icon: Calendar,
            title: "Health Tip",
            description: data.health,
            category: "Health",
            color: "text-success",
            bgColor: "bg-success/10",
            action: "View Details"
          });
        }
        if (data.recipes) {
          cards.push({
            icon: BarChart3,
            title: "Try it Out!! Recipes for food perishing fast--"+data.recipes.recipe_name || "Recipe Suggestion",
            description: data.recipes.description || "Try this recipe to reduce waste.",
            category: "Recipe",
            color: "text-primary",
            bgColor: "bg-primary/10",
            action: "View Recipe"
          });
        }
        setInsights(cards);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [backendUrl]);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">AI Insights</h2>
        <Button variant="ghost" size="sm">View All</Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
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
                    <div className="flex gap-2 items-center">
                      <Button size="sm" variant="outline" className="text-xs">
                        {insight.action}
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-primary text-white border-primary hover:bg-white hover:text-primary hover:border-primary"
                        disabled={walletLoading[index]}
                        onClick={() => handleAddToWallet(insight, index)}
                      >
                        <Wallet className="h-3 w-3 mr-1" />
                        {walletLoading[index] ? "Adding..." : "Add to Wallet"}
                      </Button>
                      {walletLinks[index] && (
                        walletLinks[index].startsWith("http") ? (
                          <a
                            href={walletLinks[index]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary underline ml-2"
                          >
                            Open Wallet Link
                          </a>
                        ) : (
                          <span className="text-xs text-destructive ml-2">{walletLinks[index]}</span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};