import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Camera, BarChart3, MessageSquare, User } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "scan", icon: Camera, label: "Scan" },
    { id: "insights", icon: BarChart3, label: "Insights" },
    { id: "query", icon: MessageSquare, label: "Ask AI" },
    { id: "profile", icon: User, label: "Profile" }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-elevated z-50">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onTabChange(item.id)}
              className={`h-full rounded-none flex flex-col gap-1 p-2 ${
                isActive 
                  ? "text-primary bg-primary/5" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <IconComponent className={`h-5 w-5 ${isActive ? "scale-110" : ""} transition-transform`} />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};