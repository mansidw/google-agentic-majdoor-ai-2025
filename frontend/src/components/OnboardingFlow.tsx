import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Wallet, TrendingUp, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-receipt-scan.jpg";

interface OnboardingFlowProps {
  onSignIn?: () => void;
}

export const OnboardingFlow = ({ onSignIn }: OnboardingFlowProps) => {
  const { toast } = useToast();

  const handleGoogleSignIn = () => {
    toast({
      title: "Signing in...",
      description: "Connecting to Google services",
    });
    
    setTimeout(() => {
      toast({
        title: "Welcome to Raseed!",
        description: "Successfully connected to Google Wallet",
      });
      onSignIn?.();
    }, 2000);
  };
  return (
    <div className="min-h-screen bg-primary">
      <div className="container mx-auto px-4 pt-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <img 
            src={heroImage} 
            alt="Receipt Scanning" 
            className="mx-auto rounded-2xl shadow-elevated mb-6 w-full max-w-md"
          />
          <h1 className="text-3xl font-bold text-primary-foreground mb-4">
            Welcome to Raseed
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md mx-auto">
            Smart receipt scanning with AI insights and Google Wallet integration
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="p-6 animate-fade-in bg-card border-0 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-card-foreground">Smart Scanning</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Capture receipts with AI-powered extraction and analysis
            </p>
          </Card>

          <Card className="p-6 animate-fade-in bg-card border-0 shadow-card" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-accent/10 rounded-full">
                <Wallet className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold text-card-foreground">Wallet Integration</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Save passes directly to your Google Wallet
            </p>
          </Card>

          <Card className="p-6 animate-fade-in bg-card border-0 shadow-card" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-info/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
              <h3 className="font-semibold text-card-foreground">AI Insights</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Get spending trends and personalized recommendations
            </p>
          </Card>

          <Card className="p-6 animate-fade-in bg-card border-0 shadow-card" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-warning/10 rounded-full">
                <Globe className="h-5 w-5 text-warning" />
              </div>
              <h3 className="font-semibold text-card-foreground">Multilingual</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Ask questions in your local language
            </p>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center pb-8">
          <Button 
            size="lg" 
            onClick={handleGoogleSignIn}
            className="bg-card text-primary hover:bg-card/90 shadow-card mb-4 w-full max-w-sm animate-scale-in"
            style={{ animationDelay: '0.4s' }}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </Button>
          <p className="text-primary-foreground/60 text-xs">
            We'll link your Google Wallet for seamless pass integration
          </p>
        </div>
      </div>
    </div>
  );
};