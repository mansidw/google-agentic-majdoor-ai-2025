import { useState, useEffect } from 'react';
import { 
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
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
      const user = result.user;
      
      toast({
        title: "Welcome to Raseed!",
        description: `Successfully signed in as ${user.displayName}`,
      });

      return user;
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

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
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
    loading,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user
  };
};
