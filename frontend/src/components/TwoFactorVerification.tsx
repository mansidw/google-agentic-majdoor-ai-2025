import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, Timer, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { twoFactorAuthService } from "@/services/twoFactorAuth";

export const TwoFactorVerification = () => {
  const { pendingUser, verifyCode, sendVerificationCode, resendCode, loading } = useAuth();
  const [code, setCode] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [hasInitialCodeSent, setHasInitialCodeSent] = useState(false);

  useEffect(() => {
    // Automatically send verification code when component mounts (only once)
    if (pendingUser?.email && !hasInitialCodeSent) {
      sendVerificationCode(pendingUser.email);
      setHasInitialCodeSent(true);
    }
  }, [pendingUser?.email, hasInitialCodeSent]); // Removed sendVerificationCode from deps

  useEffect(() => {
    // Update timer every second
    const timer = setInterval(() => {
      const remaining = twoFactorAuthService.getTimeRemaining();
      setTimeRemaining(remaining);
      setCanResend(remaining === 0);
      
      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      console.log('🔐 Submitting verification code...');
      const success = await verifyCode(code);
      if (success) {
        console.log('✅ Verification successful - user should now be redirected');
      }
    }
  };

  const handleResendCode = async () => {
    if (canResend && pendingUser?.email) {
      setCode("");
      await resendCode();
      setTimeRemaining(twoFactorAuthService.getTimeRemaining());
      setCanResend(false);
    }
  };

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!pendingUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-0 shadow-elevated">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
          <CardDescription>
            We've sent a verification code to your email address for added security
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="p-2 bg-accent/10 rounded-full">
              <Mail className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{pendingUser.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                Code sent to: {pendingUser.email}
              </p>
            </div>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest font-mono"
                autoComplete="one-time-code"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>
          </form>

          {/* Timer and Resend */}
          <div className="text-center space-y-3">
            {timeRemaining > 0 ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span>Code expires in {formatTime(timeRemaining)}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Code has expired
              </p>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleResendCode}
              disabled={!canResend || loading}
              className="text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Resend Code
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-xs text-muted-foreground space-y-2">
            <p>Didn't receive the code? Check your spam folder or try resending.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
              <p className="font-medium text-blue-800 mb-1">📧 Email Status:</p>
              <p className="text-blue-700">
                Real emails will be sent if EmailJS is configured. 
                Otherwise, check browser console for the verification code.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
