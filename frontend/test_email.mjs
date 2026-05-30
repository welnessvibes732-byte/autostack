import nodemailer from "nodemailer";

async function test() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER || "niteshdevarla@gmail.com",
      pass: process.env.GMAIL_APP_PASSWORD || "YOUR_APP_PASSWORD"
    },
    debug: true,
    logger: true
  });

  try {
    console.log("Attempting to send email via Gmail...");
    const info = await transporter.sendMail({
      from: `"PropIQ Automation" <niteshdevarla@gmail.com>`,
      to: "niteshdevarla@gmail.com",
      subject: "Test Email from Code",
      html: "<b>If you get this, Nodemailer is working perfectly!</b>"
    });
    console.log("[EMAIL SENT SUCCESSFULLY] Message ID:", info.messageId);
  } catch (error) {
    console.error("[EMAIL SEND FAILED]", error);
  }
}

test();
