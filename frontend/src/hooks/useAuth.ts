import { useState, useEffect } from 'react';
import { 
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { twoFactorAuthService } from '@/services/twoFactorAuth';

interface PendingUser {
  user: User;
  email: string;
  displayName: string;
  photoURL?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needs2FA, setNeeds2FA] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Check if 2FA is already verified for this user using localStorage only
        // This prevents infinite loops while still maintaining session persistence
        const isVerified = twoFactorAuthService.isVerifiedFrontend(firebaseUser.email!);
        if (isVerified) {
          setUser(firebaseUser);
          setNeeds2FA(false);
          setPendingUser(null);
        } else {
          // User signed in but needs 2FA verification
          setPendingUser({
            user: firebaseUser,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || 'User',
            photoURL: firebaseUser.photoURL || undefined
          });
          setNeeds2FA(true);
          setUser(null);
        }
      } else {
        setUser(null);
        setPendingUser(null);
        setNeeds2FA(false);
        twoFactorAuthService.clearVerification();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      toast({
        title: "Signing in...",
        description: "Connecting to Google services",
      });

      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      // Set pending user for 2FA verification
      setPendingUser({
        user: firebaseUser,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || 'User',
        photoURL: firebaseUser.photoURL || undefined
      });
      setNeeds2FA(true);
      
      toast({
        title: "Email verification required",
        description: "Please check your email for the verification code",
      });

      return firebaseUser;
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      toast({
        title: "Sign-in failed",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCode = async (email: string) => {
    try {
      setLoading(true);
      const userName = pendingUser?.displayName || 'User';
      await twoFactorAuthService.sendVerificationCode(email, userName);
      
      toast({
        title: "Verification code sent",
        description: "Please check your email for the 6-digit code",
      });
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      toast({
        title: "Failed to send code",
        description: error.message || "Could not send verification email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (code: string) => {
    if (!pendingUser) {
      throw new Error('No pending user for verification');
    }

    try {
      setLoading(true);
      console.log('🔐 Verifying 2FA code for:', pendingUser.email);
      
      const isValid = await twoFactorAuthService.verifyCode(code, pendingUser.email);
      
      if (isValid) {
        console.log('✅ 2FA verification successful, setting user as authenticated');
        
        // Store the current pending user
        const currentUser = pendingUser.user;
        
        // Clear 2FA state first, then set authenticated user
        setNeeds2FA(false);
        setPendingUser(null);
        setUser(currentUser);
        
        console.log('✅ Auth state updated successfully');
        
        toast({
          title: "Welcome to Raseed!",
          description: `Successfully verified and signed in as ${pendingUser.displayName}`,
        });
        
        // Reload the page after successful 2FA to ensure clean state
        console.log('🔄 Reloading page to ensure clean state...');
        setTimeout(() => {
          window.location.reload();
        }, 1000); // Small delay to show the success message
        
        return true;
      } else {
        console.log('❌ 2FA verification failed');
        toast({
          title: "Invalid verification code",
          description: "Please check the code and try again",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast({
        title: "Verification failed",
        description: error.message || "Could not verify the code",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!pendingUser) {
      throw new Error('No pending user for code resend');
    }
    
    try {
      setLoading(true);
      const userName = pendingUser?.displayName || 'User';
      await twoFactorAuthService.resendVerificationCode(pendingUser.email, userName);
      
      toast({
        title: "Verification code resent",
        description: "Please check your email for the new 6-digit code",
      });
    } catch (error: any) {
      console.error('Error resending verification code:', error);
      toast({
        title: "Failed to resend code",
        description: error.message || "Could not resend verification email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      twoFactorAuthService.clearVerification();
      setUser(null);
      setPendingUser(null);
      setNeeds2FA(false);
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      });
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: "Sign-out failed",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  return {
    user,
    pendingUser,
    loading,
    needs2FA,
    signInWithGoogle,
    sendVerificationCode,
    verifyCode,
    resendCode,
    signOut,
    isAuthenticated: !!user
  };
};
