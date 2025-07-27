// Demo Email Service
// In production, replace this with a real email service like SendGrid, AWS SES, etc.

export interface EmailTemplate {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

class DemoEmailService {
  async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In development, log to console
      console.log('📧 Email Sent Successfully!');
      console.log('─'.repeat(50));
      console.log(`To: ${template.to}`);
      console.log(`Subject: ${template.subject}`);
      console.log('─'.repeat(50));
      console.log(template.textContent);
      console.log('─'.repeat(50));
      
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
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
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .code { 
            background: #f4f4f4; 
            padding: 20px; 
            text-align: center; 
            font-size: 24px; 
            font-weight: bold; 
            letter-spacing: 4px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Raseed</h1>
            <h2>Email Verification</h2>
        </div>
        
        <p>Hello ${userName},</p>
        
        <p>Your verification code for Raseed is:</p>
        
        <div class="code">${code}</div>
        
        <p>This code will expire in 10 minutes.</p>
        
        <p>If you didn't request this code, please ignore this email.</p>
        
        <div class="footer">
            <p>Best regards,<br>The Raseed Team</p>
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

export const demoEmailService = new DemoEmailService();
