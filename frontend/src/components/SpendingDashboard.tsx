import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, PieChart, DollarSign, TrendingUp, IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

export interface IDashboardData {
  totalSpent: number;
  totalPasses: number;
  average: number;
  totalCategories: number;
  categoryData: Array<{
    name: string;
    amount: number;
  }>;
}

export const SpendingDashboard = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [filter, setFilter] = useState<string>("yearly");
  const [dashboardData, setDashboardData] = useState<IDashboardData>(null);
  const [loading, setLoading] = useState(false);
  const color = [
    "bg-primary",
    "bg-info",
    "bg-warning",
    "bg-success",
    "bg-muted",
  ];

  useEffect(() => {
    const API_ENDPOINT = backendUrl + "/expenditure/summary";
    setLoading(true);
    axios
      .get(API_ENDPOINT, { params: { filter } })
      .then((res) => {
        setDashboardData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setDashboardData(null);
        setLoading(false);
      });
  }, [backendUrl, filter]);

  function renderCards() {
    if (!loading) {
      return (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-card border-0 shadow-card">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <IndianRupee className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="text-lg font-semibold text-card-foreground">
                    {dashboardData?.totalSpent ?? 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-card border-0 shadow-card">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Passes</p>
                  <p className="text-lg font-semibold text-primary">
                    {dashboardData?.totalPasses ?? "0"}
                  </p>
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
                  <p className="text-lg font-semibold text-card-foreground">
                    {dashboardData?.average ?? 0}
                  </p>
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
                  <p className="text-lg font-semibold text-card-foreground">
                    {dashboardData?.totalCategories ?? 0}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <Card className="p-6 bg-card border-0 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-card-foreground">
                  By Category
                </h3>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>

              <div className="space-y-4">
                {(dashboardData?.categoryData ?? []).map(
                  (category: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-card-foreground">
                          {category.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {category.amount}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${color[index % 5]}`}
                          style={{
                            width: `${
                              (category.amount / dashboardData.totalSpent) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </Card>

            {/* Monthly Trend */}
            {/* <Card className="p-6 bg-card border-0 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-card-foreground">
              Monthly Trend
            </h3>
            <Button variant="ghost" size="sm">
              Export
            </Button>
          </div>

          <div className="space-y-3">
            {(dashboardData?.monthlyData ?? []).map(
              (month: any, index: number) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-card-foreground w-8">
                    {month.month}
                  </span>
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
              )
            )}
          </div>
        </Card> */}
          </div>
        </>
      );
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">
          Spending Dashboard
        </h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {renderCards()}
    </div>
  );
};
