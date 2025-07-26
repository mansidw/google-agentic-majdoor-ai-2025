import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, PieChart, DollarSign, TrendingUp } from "lucide-react";

export const SpendingDashboard = () => {
  const categoryData = [
    { name: "Groceries", amount: 342, percentage: 45, color: "bg-primary" },
    { name: "Restaurants", amount: 185, percentage: 25, color: "bg-primary" },
    { name: "Transport", amount: 89, percentage: 12, color: "bg-info" },
    { name: "Shopping", amount: 76, percentage: 10, color: "bg-warning" },
    { name: "Others", amount: 58, percentage: 8, color: "bg-muted" }
  ];

  const monthlyData = [
    { month: "Jan", amount: 720 },
    { month: "Feb", amount: 650 },
    { month: "Mar", amount: 780 },
    { month: "Apr", amount: 690 },
    { month: "May", amount: 750 }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">Spending Dashboard</h2>
        <Select defaultValue="this-month">
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-0 shadow-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-lg font-semibold text-card-foreground">$750</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-0 shadow-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">vs Last Month</p>
              <p className="text-lg font-semibold text-primary">+8.7%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-0 shadow-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-full">
              <BarChart3 className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg/Day</p>
              <p className="text-lg font-semibold text-card-foreground">$24</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-0 shadow-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-full">
              <PieChart className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Categories</p>
              <p className="text-lg font-semibold text-card-foreground">5</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="p-6 bg-card border-0 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-card-foreground">By Category</h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          
          <div className="space-y-4">
            {categoryData.map((category, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-card-foreground">{category.name}</span>
                  <span className="text-sm text-muted-foreground">${category.amount}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${category.color}`}
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Trend */}
        <Card className="p-6 bg-card border-0 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-card-foreground">Monthly Trend</h3>
            <Button variant="ghost" size="sm">Export</Button>
          </div>
          
          <div className="space-y-3">
            {monthlyData.map((month, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="text-sm font-medium text-card-foreground w-8">{month.month}</span>
                <div className="flex-1 bg-muted rounded-full h-8 relative">
                  <div 
                    className="bg-gradient-primary h-8 rounded-full flex items-center justify-end pr-3"
                    style={{ width: `${(month.amount / 800) * 100}%` }}
                  >
                    <span className="text-xs font-medium text-foreground font-semibold">
                      ${month.amount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};