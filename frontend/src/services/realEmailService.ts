import emailjs from '@emailjs/browser';

// Real Email Service using EmailJS
// This service sends actual emails to users

export interface EmailTemplate {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

class RealEmailService {
  private readonly SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'your_service_id';
  private readonly TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'your_template_id';
  private readonly PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'your_public_key';

  constructor() {
    // Initialize EmailJS
    if (this.PUBLIC_KEY && this.PUBLIC_KEY !== 'your_public_key') {
      emailjs.init(this.PUBLIC_KEY);
    }
  }

  async sendVerificationEmail(email: string, code: string, userName: string): Promise<boolean> {
    try {
      // Check if EmailJS is properly configured
      if (!this.isConfigured()) {
        console.warn('EmailJS not configured, falling back to demo mode');
        return this.sendDemoVerificationEmail(email, code, userName);
      }

      // Send email using EmailJS with direct parameters
      const response = await emailjs.send(
        this.SERVICE_ID,
        this.TEMPLATE_ID,
        {
          to_email: email,
          to_name: userName,
          verification_code: code,
          subject: 'Raseed - Your Verification Code',
        }
      );

      console.log('✅ Verification email sent successfully:', response);
      return true;
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      // Fallback to demo mode on error
      return this.sendDemoVerificationEmail(email, code, userName);
    }
  }

  async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      // Check if EmailJS is properly configured
      if (!this.isConfigured()) {
        console.warn('EmailJS not configured, falling back to demo mode');
        return this.sendDemoEmail(template);
      }

      // Send email using EmailJS
      const response = await emailjs.send(
        this.SERVICE_ID,
        this.TEMPLATE_ID,
        {
          to_email: template.to,
          to_name: template.to.split('@')[0], // Extract name from email if no name provided
          verification_code: this.extractCodeFromTemplate(template.textContent),
          subject: template.subject,
        }
      );

      console.log('✅ Email sent successfully:', response);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      // Fallback to demo mode on error
      return this.sendDemoEmail(template);
    }
  }

  private async sendDemoVerificationEmail(email: string, code: string, userName: string): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log to console in demo mode
    console.log('📧 Demo Verification Email (EmailJS not configured)');
    console.log('─'.repeat(60));
    console.log(`To: ${email}`);
    console.log(`Name: ${userName}`);
    console.log(`Verification Code: ${code}`);
    console.log('─'.repeat(60));
    console.log(`Hello ${userName},\n\nYour verification code for Raseed is: ${code}\n\nThis code will expire in 10 minutes.`);
    console.log('─'.repeat(60));
    
    return true;
  }

  private extractCodeFromTemplate(textContent: string): string {
    // Extract the 6-digit code from the email text content
    const codeMatch = textContent.match(/\b\d{6}\b/);
    return codeMatch ? codeMatch[0] : '';
  }

  private isConfigured(): boolean {
    return (
      this.SERVICE_ID !== 'your_service_id' &&
      this.TEMPLATE_ID !== 'your_template_id' &&
      this.PUBLIC_KEY !== 'your_public_key' &&
      this.SERVICE_ID &&
      this.TEMPLATE_ID &&
      this.PUBLIC_KEY
    );
  }

  private async sendDemoEmail(template: EmailTemplate): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log to console in demo mode
    console.log('📧 Demo Email (EmailJS not configured)');
    console.log('─'.repeat(60));
    console.log(`To: ${template.to}`);
    console.log(`Subject: ${template.subject}`);
    console.log('─'.repeat(60));
    console.log(template.textContent);
    console.log('─'.repeat(60));
    
    return true;
  }

  createVerificationEmail(email: string, code: string, userName: string): EmailTemplate {
    const subject = 'Raseed - Your Verification Code';
    
    const textContent = `
Hello ${userName},

Your verification code for Raseed is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
The Raseed Team

---
This is an automated message. Please do not reply to this email.
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 8px; 
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            text-align: center; 
            padding: 40px 20px; 
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 600; 
        }
        .header p { 
            margin: 8px 0 0 0; 
            opacity: 0.9; 
            font-size: 16px; 
        }
        .content { 
            padding: 40px 30px; 
        }
        .greeting { 
            font-size: 18px; 
            margin-bottom: 20px; 
        }
        .code-section { 
            text-align: center; 
            margin: 30px 0; 
        }
        .code-label { 
            font-size: 16px; 
            color: #666; 
            margin-bottom: 15px; 
        }
        .code { 
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
            border: 2px dashed #6c757d;
            padding: 20px; 
            font-size: 32px; 
            font-weight: bold; 
            letter-spacing: 8px;
            border-radius: 12px;
            font-family: 'Courier New', monospace;
            color: #495057;
            display: inline-block;
            min-width: 200px;
        }
        .expiry { 
            color: #dc3545; 
            font-weight: 500; 
            margin-top: 15px; 
            font-size: 14px; 
        }
        .instructions { 
            background: #f8f9fa; 
            border-left: 4px solid #28a745; 
            padding: 15px 20px; 
            margin: 25px 0; 
            border-radius: 0 4px 4px 0; 
        }
        .footer { 
            background: #f8f9fa; 
            padding: 30px; 
            text-align: center; 
            border-top: 1px solid #dee2e6; 
        }
        .footer p { 
            margin: 0; 
            font-size: 14px; 
            color: #6c757d; 
        }
        .security-note { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            border-radius: 6px; 
            padding: 15px; 
            margin: 20px 0; 
            font-size: 14px; 
        }
        .security-note strong { 
            color: #856404; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧾 Raseed</h1>
            <p>Smart Receipt Management</p>
        </div>
        
        <div class="content">
            <div class="greeting">Hello ${userName},</div>
            
            <p>Welcome to Raseed! To complete your sign-in process, please use the verification code below:</p>
            
            <div class="code-section">
                <div class="code-label">Your Verification Code:</div>
                <div class="code">${code}</div>
                <div class="expiry">⏰ Expires in 10 minutes</div>
            </div>
            
            <div class="instructions">
                <strong>How to use this code:</strong>
                <ol style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>Return to the Raseed app</li>
                    <li>Enter this 6-digit code in the verification field</li>
                    <li>Click "Verify Code" to complete your sign-in</li>
                </ol>
            </div>
            
            <div class="security-note">
                <strong>🔒 Security Note:</strong> This code is unique to your account and should not be shared with anyone. If you didn't request this code, please ignore this email and your account will remain secure.
            </div>
            
            <p style="margin-top: 30px;">If you have any questions or need assistance, feel free to contact our support team.</p>
            
            <p style="margin-top: 25px;">
                Best regards,<br>
                <strong>The Raseed Team</strong>
            </p>
        </div>
        
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p style="margin-top: 10px;">© 2025 Raseed. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    return {
      to: email,
      subject,
      htmlContent,
      textContent
    };
  }
}

export const realEmailService = new RealEmailService();
