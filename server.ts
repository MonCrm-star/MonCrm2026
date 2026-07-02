import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Load email tracking data
  const TRACKING_FILE = path.join(process.cwd(), "email-tracking.json");
  const emailTracker = new Map<string, { openCount: number, opens: string[] }>();
  
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      const rawData = fs.readFileSync(TRACKING_FILE, "utf-8");
      const parsed = JSON.parse(rawData);
      for (const [key, val] of Object.entries(parsed)) {
        emailTracker.set(key, val as { openCount: number, opens: string[] });
      }
    }
  } catch (err) {
    console.error("Error loading email tracking file:", err);
  }

  // Middleware to parse JSON bodies with increased size limit
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: Test SMTP connection
  app.post("/api/test-smtp", async (req, res) => {
    try {
      const { host, port, user, pass, sslTls } = req.body || {};

      if (!host || !port || !user || !pass) {
        return res.status(400).json({
          success: false,
          message: "Champs requis manquants : hôte, port, utilisateur ou mot de passe."
        });
      }

      const isSecure = parseInt(port) === 465;
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: isSecure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false // Prevents common self-signed certificate issues
        },
        connectionTimeout: 8000 // 8 seconds timeout
      });

      await transporter.verify();
      
      return res.json({
        success: true,
        message: `Connexion établie avec succès au serveur SMTP ${host}:${port} !`
      });
    } catch (error: any) {
      console.error("SMTP Connection Test Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Erreur lors de la connexion au serveur SMTP."
      });
    }
  });

  // API Route: Send Email
  app.post("/api/send-email", async (req, res) => {
    try {
      const { smtp, to, subject, body, cabinet, agent, emailId, origin, customAttachments } = req.body || {};

      if (!smtp || !to || !subject || !body) {
        return res.status(400).json({
          success: false,
          message: "Champs requis manquants : configuration SMTP, destinataire, sujet ou message."
        });
      }

      const { host, port, user, pass, senderName, senderEmail } = smtp || {};

      if (!host || !port || !user || !pass) {
        return res.status(400).json({
          success: false,
          message: "Configuration SMTP incomplète."
        });
      }

      const isSecure = parseInt(port) === 465;
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: isSecure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000
      });

      // Format professional HTML body if cabinet details are supplied
      let htmlBody = "";
      const attachments: any[] = [];

      // Add custom attachments if supplied
      if (customAttachments && Array.isArray(customAttachments)) {
        for (const att of customAttachments) {
          if (att && att.filename && att.content) {
            let base64Data = att.content;
            if (base64Data.startsWith("data:")) {
              const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
              if (matches) {
                base64Data = matches[2];
              }
            }
            attachments.push({
              filename: att.filename,
              content: Buffer.from(base64Data, "base64")
            });
          }
        }
      }
      if (cabinet) {
        let logoHtml = "";
        if (cabinet.logoUrl && cabinet.logoUrl.startsWith("data:")) {
          const matches = cabinet.logoUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const contentType = matches[1];
            const base64Data = matches[2];
            const extension = contentType.split("/")[1] || "png";
            
            attachments.push({
              filename: `logo.${extension}`,
              content: Buffer.from(base64Data, "base64"),
              cid: "cabinet_logo"
            });
            logoHtml = `<img src="cid:cabinet_logo" alt="${cabinet.nomCabinet}" class="logo-img" style="max-height: 55px; max-width: 180px; display: block; height: auto; border: 0;" />`;
          } else {
            logoHtml = `<span style="font-size: 18px; font-weight: bold; color: #4f46e5; font-family: sans-serif;">🏢 ${cabinet.nomCabinet}</span>`;
          }
        } else if (cabinet.logoUrl) {
          logoHtml = `<img src="${cabinet.logoUrl}" alt="${cabinet.nomCabinet}" class="logo-img" style="max-height: 55px; max-width: 180px; display: block; height: auto; border: 0;" />`;
        } else {
          logoHtml = `<span style="font-size: 18px; font-weight: bold; color: #4f46e5; font-family: sans-serif;">🏢 ${cabinet.nomCabinet}</span>`;
        }

        const finalAgentName = agent ? `${agent.prenom || ''} ${agent.nom || ''}`.trim() : (senderName || 'Votre Conseiller');
        const agentPhone = agent?.telephone || cabinet.tel || '';
        const agentEmail = agent?.email || cabinet.email || '';

        const paragraphs = (body || "")
          .split('\n')
          .map((p: string) => p.trim())
          .map((p: string) => {
            if (p.length === 0) return '<div style="height: 12px;"></div>';
            return `<p style="margin-top: 0; margin-bottom: 14px; color: #334155; font-size: 14px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${p}</p>`;
          })
          .join('\n');

        htmlBody = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>${subject}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style type="text/css">
    body {
      width: 100% !important; 
      -webkit-text-size-adjust: 100%; 
      -ms-text-size-adjust: 100%; 
      margin: 0; 
      padding: 0;
      background-color: #f8fafc;
    }
    .ExternalClass { width: 100%; }
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
    #backgroundTable { margin: 0; padding: 0; width: 100% !important; line-height: 100% !important; }
    img { outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    a img { border: none; }
    .image_fix { display: block; }
    p { margin: 1em 0; }

    /* Mobile Responsive Rules */
    @media only screen and (max-width: 600px) {
      .outer-table {
        padding: 10px 4px !important;
      }
      .main-container {
        width: 100% !important;
        border-radius: 8px !important;
      }
      .header-padding {
        padding: 20px 16px !important;
      }
      .subject-padding {
        padding: 12px 16px !important;
      }
      .content-padding {
        padding: 24px 16px !important;
      }
      .footer-padding {
        padding: 24px 16px !important;
      }
      .header-table td {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        padding-bottom: 15px !important;
      }
      .header-table td:last-child {
        padding-bottom: 0 !important;
        text-align: center !important;
      }
      .logo-img {
        margin: 0 auto !important;
      }
      .agent-table {
        width: 100% !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" background="#f8fafc" class="outer-table" style="background-color: #f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" class="main-container" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);">
          
          <!-- TOP BLUE BAR & HEADER -->
          <tr>
            <td class="header-padding" style="background-color: #ffffff; border-bottom: 3px solid #4f46e5; padding: 24px 30px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" class="header-table">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    ${logoHtml}
                  </td>
                  <td align="right" style="vertical-align: middle; color: #64748b; font-size: 11px; line-height: 1.5; font-family: sans-serif;">
                    <strong style="color: #1e293b; font-size: 12px;">${cabinet.nomCabinet}</strong><br />
                    Tél : ${cabinet.tel}<br />
                    ${cabinet.email}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SUBJECT HEADER -->
          <tr>
            <td class="subject-padding" style="background-color: #f1f5f9; padding: 14px 30px; border-bottom: 1px solid #e2e8f0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size: 13.5px; font-weight: bold; color: #1e293b; font-family: sans-serif;">
                    Objet : <span style="font-weight: normal; color: #475569;">${subject}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- EMAIL BODY CONTENT -->
          <tr>
            <td class="content-padding" style="padding: 30px 30px; background-color: #ffffff;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="color: #334155; font-size: 14px; line-height: 1.6; font-family: sans-serif;">
                    ${paragraphs}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER DETAILS & LEGAL NOTES -->
          <tr>
            <td class="footer-padding" style="background-color: #0f172a; color: #94a3b8; padding: 26px 30px; text-align: center; font-family: sans-serif;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="font-size: 13px; font-weight: bold; color: #f8fafc; padding-bottom: 6px;">
                    ${cabinet.nomCabinet}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 11px; color: #cbd5e1; padding-bottom: 12px; line-height: 1.4;">
                    📍 ${cabinet.adresse}, ${cabinet.codePostal} ${cabinet.ville}<br />
                    📞 Téléphone : ${cabinet.tel} &nbsp;|&nbsp; ✉️ E-mail : ${cabinet.email}
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="height: 1px; background-color: #334155;"></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 10px; color: #64748b; padding-top: 12px; padding-bottom: 12px;">
                    Intermédiaire en assurances &nbsp;|&nbsp; Numéro SIRET : ${cabinet.siret} &nbsp;|&nbsp; Enregistré conformément à la législation en vigueur.
                  </td>
                </tr>
                <tr>
                  <td align="left" style="font-size: 9px; color: #475569; text-align: justify; line-height: 1.4;">
                    <strong>Notice légale :</strong> Ce message électronique, ainsi que toutes ses pièces jointes, contient des informations confidentielles destinées uniquement à la personne ou l'entité à qui elles sont adressées. L'utilisation, la divulgation, la distribution ou la copie non autorisée de ce message est strictement interdite. Si vous avez reçu ce message par erreur, merci de bien vouloir en informer immédiatement l'expéditeur et de supprimer ce message de votre système.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;
      } else {
        htmlBody = (body || "").replace(/\n/g, '<br />');
      }

      if (emailId) {
        let publicUrl = origin;
        if (!publicUrl) {
          const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000";
          const proto = req.headers["x-forwarded-proto"] || "http";
          // Handle potentially multiple proxies/hosts
          const singleHost = typeof host === "string" ? host.split(",")[0].trim() : (Array.isArray(host) ? host[0] : "localhost:3000");
          publicUrl = `${proto}://${singleHost}`;
        }
        
        const trackingPixel = `<img src="${publicUrl}/api/track-open/${emailId}" width="1" height="1" style="display:none !important; width:1px !important; height:1px !important; border:0 !important; margin:0 !important; padding:0 !important;" alt="" />`;
        
        if (htmlBody.includes("</body>")) {
          htmlBody = htmlBody.replace("</body>", `${trackingPixel}</body>`);
        } else {
          htmlBody = htmlBody + trackingPixel;
        }
      }

      const mailOptions = {
        from: `"${senderName || 'Conseiller d\'Assurance'}" <${senderEmail || user}>`,
        to,
        subject,
        text: body,
        html: htmlBody,
        ...(attachments.length > 0 ? { attachments } : {})
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);

      return res.json({
        success: true,
        message: `L'e-mail a été envoyé avec succès à ${to} !`
      });
    } catch (error: any) {
      console.error("SMTP Send Email Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "L'envoi du courriel a échoué. Veuillez vérifier vos paramètres SMTP."
      });
    }
  });

  // API Route: Track email opening
  app.get("/api/track-open/:emailId", (req, res) => {
    try {
      const { emailId } = req.params;
      const now = new Date().toISOString();
      
      const trackData = emailTracker.get(emailId) || { openCount: 0, opens: [] };
      trackData.openCount += 1;
      trackData.opens.push(now);
      emailTracker.set(emailId, trackData);
      
      // Persist to file asynchronously
      fs.writeFile(TRACKING_FILE, JSON.stringify(Object.fromEntries(emailTracker), null, 2), (err) => {
        if (err) console.error("Error saving tracking data:", err);
      });
      
      // Serve a 1x1 transparent GIF
      const gifBuffer = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
      res.writeHead(200, {
        "Content-Type": "image/gif",
        "Content-Length": gifBuffer.length,
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      });
      res.end(gifBuffer);
    } catch (error) {
      console.error("Tracking Error:", error);
      // Return 1x1 transparent GIF even on error to avoid breaking clients
      const gifBuffer = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
      res.writeHead(200, { "Content-Type": "image/gif" });
      res.end(gifBuffer);
    }
  });

  // API Route: Retrieve email tracking statuses
  app.get("/api/email-status", (req, res) => {
    try {
      res.json(Object.fromEntries(emailTracker));
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to retrieve statuses" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
