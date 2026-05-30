import imaps from "imap-simple";
import { simpleParser } from "mailparser";

async function run() {
  const emailUser = "niteshdevarla@gmail.com";
  const emailPass = "buxn vzlr dbuj ewnw";

  const config = {
    imap: {
      user: emailUser,
      password: emailPass,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000
    }
  };

  try {
    console.log("Connecting to IMAP...");
    const connection = await imaps.connect(config);
    await connection.openBox("INBOX");

    const searchCriteria = ["UNSEEN"];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT", ""],
      markSeen: false
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`Found ${messages.length} unread messages.`);
    
    for (const message of messages) {
      const allParts = message.parts.find((part) => part.which === "");
      if (!allParts) continue;

      const id = message.attributes.uid;
      const idHeader = "Imap-Id: " + id + "\r\n";
      const parsed = await simpleParser(idHeader + allParts.body);

      console.log("-----------------------------------------");
      console.log("From:", parsed.from?.value[0]?.address);
      console.log("Subject:", parsed.subject);
      console.log("Text:", parsed.text?.substring(0, 200));
    }
    connection.end();
  } catch (err) {
    console.error(err);
  }
}
run();
