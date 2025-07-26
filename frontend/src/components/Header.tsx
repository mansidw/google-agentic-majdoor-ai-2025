import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";
import appIcon from "@/assets/app-icon.jpg";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-card">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src={appIcon} alt="Raseed" className="h-8 w-8 rounded-lg" />
          <h1 className="text-xl font-semibold text-foreground">Raseed</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <NotificationsDropdown />
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};