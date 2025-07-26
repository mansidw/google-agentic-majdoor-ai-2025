import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { TwoFactorVerification } from "@/components/TwoFactorVerification";
import { ReceiptUpload } from "@/components/ReceiptUpload";
import { InsightCards } from "@/components/InsightCards";
import { SpendingDashboard } from "@/components/SpendingDashboard";
import { QueryInterface } from "@/components/QueryInterface";
import { useAuth } from "@/hooks/useAuth";

const AuthenticatedApp = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [renderKey, setRenderKey] = useState(0);

  // Force re-render on mount to ensure clean state
  useEffect(() => {
    console.log('🏠 AuthenticatedApp mounted, forcing re-render');
    setRenderKey(prev => prev + 1);
  }, []);

  console.log('🏠 AuthenticatedApp rendered with activeTab:', activeTab, 'renderKey:', renderKey);

  // Simple home content component
  const HomeContent = () => (
    <div className="space-y-6">
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-primary">Welcome to Raseed!</h2>
        <p className="text-muted-foreground">Your smart receipt management dashboard</p>
        <div className="mt-4 p-4 bg-primary/10 rounded-lg">
          <p className="text-sm">✅ Successfully authenticated and logged in!</p>
          <p className="text-xs text-muted-foreground mt-2">
            If you can see this message, the 2FA flow worked correctly.
          </p>
        </div>
      </div>
      <InsightCards />
      <SpendingDashboard />
    </div>
  );

  const renderTabContent = () => {
    console.log('🎯 Rendering tab content for:', activeTab);
    
    // Always ensure we have content to render
    const content = (() => {
      switch (activeTab) {
        case "home":
          return <HomeContent />;
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
          console.log('🏠 Default case - rendering home content');
          return <HomeContent />;
      }
    })();

    return content || <HomeContent />;
  };

  return (
    <div key={`app-${renderKey}`} className="min-h-screen bg-background pb-20">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {renderTabContent()}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

const Index = () => {
  const { user, loading, isAuthenticated, needs2FA } = useAuth();

  // Debug logging
  console.log('🔍 Index component - Auth State:', { 
    isAuthenticated, 
    loading, 
    needs2FA, 
    hasUser: !!user
  });

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

  // Show 2FA verification if user signed in but needs verification
  if (needs2FA) {
    console.log('🔐 Showing 2FA verification');
    return <TwoFactorVerification />;
  }

  // Show onboarding if not authenticated
  if (!isAuthenticated) {
    console.log('🚪 Showing onboarding flow');
    return <OnboardingFlow />;
  }

  // User is authenticated - show the main app interface
  console.log('✅ User authenticated - showing main app');
  return <AuthenticatedApp key={`auth-${user?.uid || 'authenticated'}`} />;
};

export default Index;
