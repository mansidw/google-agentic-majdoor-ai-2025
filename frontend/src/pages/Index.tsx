import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ReceiptUpload } from "@/components/ReceiptUpload";
import { InsightCards } from "@/components/InsightCards";
import { SpendingDashboard } from "@/components/SpendingDashboard";
import { QueryInterface } from "@/components/QueryInterface";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const { user, loading, isAuthenticated } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if not authenticated
  if (!isAuthenticated) {
    return <OnboardingFlow />;
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
