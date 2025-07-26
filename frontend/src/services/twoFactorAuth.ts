// Two-Factor Authentication Service
// This handles email verification codes for 2FA

import { realEmailService } from './realEmailService';

interface VerificationCode {
  code: string;
  email: string;
  timestamp: number;
  verified: boolean;
}

class TwoFactorAuthService {
  private readonly STORAGE_KEY = 'raseed_2fa_codes';
  private readonly CODE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes
  private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';

  // Generate a 6-digit verification code
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send verification code to email (with backend integration)
  async sendVerificationCode(email: string, userName?: string): Promise<string> {
    try {
      console.log(`🔄 Sending verification code to ${email}`);
      
      // Try backend first
      const response = await fetch(`${this.BACKEND_URL}/api/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          userName: userName || 'User'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Verification code sent via backend:', data.message);
        return 'sent'; // Backend doesn't return the actual code for security
      } else {
        const errorData = await response.json();
        console.warn('Backend verification failed:', errorData.error);
        console.warn('Falling back to frontend service');
        return this.sendVerificationCodeFrontend(email, userName);
      }
    } catch (error) {
      console.warn('Backend unavailable, using frontend service:', error);
      return this.sendVerificationCodeFrontend(email, userName);
    }
  }

  // Frontend-only verification code sending (fallback)
  private async sendVerificationCodeFrontend(email: string, userName?: string): Promise<string> {
    const code = this.generateCode();
    
    // Store the code temporarily (in production, this would be server-side)
    const verificationData: VerificationCode = {
      code,
      email,
      timestamp: Date.now(),
      verified: false
    };
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(verificationData));
    
    // Send email with verification code using real email service
    const success = await realEmailService.sendVerificationEmail(
      email, 
      code, 
      userName || 'User'
    );
    
    if (!success) {
      throw new Error('Failed to send verification email');
    }
    
    return code;
  }

  // Verify the entered code (with backend integration)
  async verifyCode(enteredCode: string, email: string): Promise<boolean> {
    try {
      // Try backend first
      const response = await fetch(`${this.BACKEND_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: enteredCode
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.verified) {
          console.log('✅ Code verified via backend');
          // Store verification in localStorage for persistence
          const verificationData: VerificationCode = {
            code: enteredCode,
            email,
            timestamp: Date.now(),
            verified: true
          };
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(verificationData));
          return true;
        }
        return false;
      } else {
        console.warn('Backend verification failed, falling back to frontend service');
        return this.verifyCodeFrontend(enteredCode, email);
      }
    } catch (error) {
      console.warn('Backend unavailable, using frontend service:', error);
      return this.verifyCodeFrontend(enteredCode, email);
    }
  }

  // Frontend-only code verification (fallback)
  private verifyCodeFrontend(enteredCode: string, email: string): boolean {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (!storedData) return false;

      const verificationData: VerificationCode = JSON.parse(storedData);
      
      // Check if code matches and hasn't expired
      const isExpired = Date.now() - verificationData.timestamp > this.CODE_EXPIRY_TIME;
      const isValidCode = verificationData.code === enteredCode;
      const isCorrectEmail = verificationData.email === email;
      
      if (isValidCode && isCorrectEmail && !isExpired) {
        // Mark as verified
        verificationData.verified = true;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(verificationData));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying code:', error);
      return false;
    }
  }

  // Check if user has completed 2FA (with backend integration)
  async isVerified(email: string): Promise<boolean> {
    try {
      // Try backend first
      const response = await fetch(`${this.BACKEND_URL}/api/auth/check-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.verified;
      } else {
        console.warn('Backend check failed, falling back to frontend service');
        return this.isVerifiedFrontend(email);
      }
    } catch (error) {
      console.warn('Backend unavailable, using frontend service:', error);
      return this.isVerifiedFrontend(email);
    }
  }

  // Frontend-only verification check (fallback)
  isVerifiedFrontend(email: string): boolean {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (!storedData) return false;

      const verificationData: VerificationCode = JSON.parse(storedData);
      const isExpired = Date.now() - verificationData.timestamp > this.CODE_EXPIRY_TIME;
      
      return verificationData.verified && 
             verificationData.email === email && 
             !isExpired;
    } catch (error) {
      return false;
    }
  }

  // Clear verification data
  clearVerification(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Resend verification code (with backend integration)
  async resendVerificationCode(email: string, userName?: string): Promise<string> {
    try {
      // Try backend first
      const response = await fetch(`${this.BACKEND_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          userName: userName || 'User'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Verification code resent via backend:', data.message);
        return 'sent';
      } else {
        console.warn('Backend resend failed, falling back to frontend service');
        return this.sendVerificationCodeFrontend(email, userName);
      }
    } catch (error) {
      console.warn('Backend unavailable, using frontend service:', error);
      return this.sendVerificationCodeFrontend(email, userName);
    }
  }

  // Get time remaining for code expiry
  getTimeRemaining(): number {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (!storedData) return 0;

      const verificationData: VerificationCode = JSON.parse(storedData);
      const timeElapsed = Date.now() - verificationData.timestamp;
      const timeRemaining = this.CODE_EXPIRY_TIME - timeElapsed;
      
      return Math.max(0, timeRemaining);
    } catch (error) {
      return 0;
    }
  }
}

export const twoFactorAuthService = new TwoFactorAuthService();
