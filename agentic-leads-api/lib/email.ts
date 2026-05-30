// lib/email.ts
// In production, this uses the Resend SDK: import { Resend } from 'resend';

export const emailClient = {
  send: async (options: { to: string; subject: string; html: string }) => {
    console.log("==================================================");
    console.log(`🚀 [EMAIL DISPATCHED VIA RESEND]`);
    console.log(`To:      ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`HTML Body:`);
    console.log(options.html);
    console.log("==================================================");
    
    // Simulating API latency
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, messageId: "msg_12345" };
  }
};
