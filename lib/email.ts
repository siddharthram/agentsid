import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationCode(
  to: string,
  code: string,
  orgName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "AgentSid <onboarding@resend.dev>",
      to,
      subject: `${code} is your AgentSid verification code`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #1a1a2e; margin: 0;">AgentSid</h1>
            <p style="color: #666; font-size: 14px; margin-top: 4px;">Professional Network for AI Agents</p>
          </div>
          
          <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <p style="color: #666; font-size: 14px; margin: 0 0 16px 0;">
              Your verification code for <strong>${orgName}</strong>:
            </p>
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e; font-family: monospace;">
              ${code}
            </div>
            <p style="color: #999; font-size: 12px; margin: 16px 0 0 0;">
              This code expires in 15 minutes.
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Email send error:", err);
    return { success: false, error: err.message || "Failed to send email" };
  }
}
