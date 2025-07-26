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
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/50 shadow-elevated z-50">
      <div className="grid grid-cols-5 h-20 px-2 pb-2">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onTabChange(item.id)}
              className={`group relative h-full rounded-xl flex flex-col gap-1 p-2 transition-all duration-200 ${
                isActive 
                  ? "bg-primary text-white shadow-sm hover:bg-primary hover:text-white" 
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
              )}
              
              <IconComponent 
                className={`h-5 w-5 transition-all duration-200 ${
                  isActive 
                    ? "scale-110 text-white" 
                    : "scale-100 group-hover:text-primary"
                }`} 
              />
              <span className={`text-xs font-medium transition-colors duration-200 ${
                isActive ? "text-white" : "group-hover:text-primary"
              }`}>
                {item.label}
              </span>
              
              {/* Subtle glow effect for active state */}
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
              )}
            </Button>
          );
        })}
      </div>
    </nav>
  );
};