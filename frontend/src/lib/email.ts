// frontend/src/lib/email.ts
import nodemailer from "nodemailer";

// Create a reusable transporter using Gmail
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    // We will use your Gmail address and the App Password you provided
    user: process.env.GMAIL_USER || "niteshdevarla@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD || "YOUR_APP_PASSWORD"
  }
});

// A wrapper to make sending easier across the app
export const sendEmail = async ({ to, subject, html, text }: { to: string, subject: string, html: string, text?: string }) => {
  try {
    const info = await transporter.sendMail({
      from: `"PropIQ Automation" <${process.env.GMAIL_USER || "niteshdevarla@gmail.com"}>`,
      to,
      subject,
      html,
      text
    });
    console.log("[EMAIL SENT SUCCESSFULLY] Message ID:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[EMAIL SEND FAILED]", error);
    return { success: false, error };
  }
};
