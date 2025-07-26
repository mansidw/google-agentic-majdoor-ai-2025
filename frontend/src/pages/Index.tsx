import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ReceiptUpload } from "@/components/ReceiptUpload";
import { InsightCards } from "@/components/InsightCards";
import { SpendingDashboard } from "@/components/SpendingDashboard";
import { QueryInterface } from "@/components/QueryInterface";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [isSignedIn, setIsSignedIn] = useState(false);

  if (!isSignedIn) {
    return <OnboardingFlow onSignIn={() => setIsSignedIn(true)} />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-6">
            <InsightCards />
            <SpendingDashboard />
          </div>
        );
      case "scan":
        return <ReceiptUpload />;
      case "insights":
        return <SpendingDashboard />;
      case "query":
        return <QueryInterface />;
      case "profile":
        return (
          <div className="max-w-md mx-auto text-center py-8">
            <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
            <p className="text-muted-foreground">Profile management coming soon...</p>
          </div>
        );
      default:
        return <InsightCards />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {renderTabContent()}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
