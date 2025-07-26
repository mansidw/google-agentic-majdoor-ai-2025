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

  // Generate a 6-digit verification code
  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send verification code to email
  async sendVerificationCode(email: string, userName?: string): Promise<string> {
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

  // Verify the entered code
  verifyCode(enteredCode: string, email: string): boolean {
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

  // Check if user has completed 2FA
  isVerified(email: string): boolean {
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
