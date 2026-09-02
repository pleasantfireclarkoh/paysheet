/**
 * Pleasant Township Fire Department incident-report mail endpoint.
 * Deploy this project as a Google Apps Script web app that executes as you.
 */

const SETTINGS = {
  // Leave blank to use the Google account that owns and deploys this script.
  PRIMARY_RECIPIENT: "ptfdclarkoh@gmail.com",

  // Add the exact GitHub Pages origin after publishing, without a trailing slash.
  // Example: "https://yourname.github.io"
  ALLOWED_ORIGIN: "",

  SENDER_NAME: "Pleasant Township Fire Department"
};

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: "PTFD Incident Report Mailer" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let payload = {};
  try {
    payload = JSON.parse((e && e.parameter && e.parameter.payload) || "{}");
    validateSubmission_(payload, e.parameter.pdfBase64);

    const recipient = SETTINGS.PRIMARY_RECIPIENT || Session.getEffectiveUser().getEmail();
    if (!recipient) {
      throw new Error("Primary recipient is unavailable. Enter it in SETTINGS.PRIMARY_RECIPIENT.");
    }

    const pdfBytes = Utilities.base64Decode(e.parameter.pdfBase64);
    const filename = safeFilename_(payload.attachmentFilename || "PTFD-Incident-Report.pdf");
    const attachment = Utilities.newBlob(pdfBytes, MimeType.PDF, filename);
    const subject = `PTFD Incident Report ${payload.incidentNumber || ""}`.trim();
    const plainBody = payload.reportText || "A completed incident report is attached.";

    MailApp.sendEmail({
      to: recipient,
      subject,
      body: plainBody,
      htmlBody: buildHtmlBody_(payload),
      attachments: [attachment],
      name: SETTINGS.SENDER_NAME
    });

    return responsePage_({
      source: "ptfd-apps-script",
      ok: true,
      requestId: payload.requestId,
      recipient
    }, payload.parentOrigin);
  } catch (error) {
    return responsePage_({
      source: "ptfd-apps-script",
      ok: false,
      requestId: payload.requestId || "",
      error: error && error.message ? error.message : String(error)
    }, payload.parentOrigin);
  }
}

function validateSubmission_(payload, pdfBase64) {
  if (!payload.requestId || !payload.parentOrigin) throw new Error("Submission identity is missing.");
  if (SETTINGS.ALLOWED_ORIGIN && payload.parentOrigin !== SETTINGS.ALLOWED_ORIGIN) {
    throw new Error("This website is not allowed to send incident reports.");
  }
  if (!payload.incidentNumber || !payload.incidentDate || !payload.sceneAddress) {
    throw new Error("Required incident details are missing.");
  }
  if (!pdfBase64 || pdfBase64.length < 1000) throw new Error("The PDF attachment is missing.");
  if (pdfBase64.length > 12 * 1024 * 1024) throw new Error("The PDF attachment is too large.");
}

function buildHtmlBody_(payload) {
  return `
    <div style="font-family:Arial,sans-serif;color:#1e252b;max-width:680px;margin:auto">
      <div style="background:#8f261f;color:white;padding:18px 22px">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;opacity:.78">Pleasant Township Fire Department</div>
        <h1 style="font-family:Georgia,serif;font-size:25px;margin:4px 0 0">Incident Report ${escapeHtml_(payload.incidentNumber)}</h1>
      </div>
      <div style="padding:20px 22px;border:1px solid #ddd;border-top:0">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:7px 0;color:#68737c">Date</td><td style="padding:7px 0;font-weight:bold">${escapeHtml_(payload.incidentDate)}</td></tr>
          <tr><td style="padding:7px 0;color:#68737c">Type</td><td style="padding:7px 0;font-weight:bold">${escapeHtml_(payload.incidentType)}</td></tr>
          <tr><td style="padding:7px 0;color:#68737c">Scene address</td><td style="padding:7px 0;font-weight:bold">${escapeHtml_(payload.sceneAddress)}</td></tr>
        </table>
        <h2 style="font-size:15px;margin:22px 0 8px">Report details</h2>
        <pre style="white-space:pre-wrap;font:13px/1.5 Arial,sans-serif;background:#f6f5f1;border-radius:8px;padding:14px">${escapeHtml_(payload.reportText)}</pre>
        <p style="margin:18px 0 0;font-size:13px;color:#68737c">The original one-page incident sheet is attached as <strong>${escapeHtml_(payload.attachmentFilename)}</strong>.</p>
      </div>
    </div>`;
}

function responsePage_(message, requestedOrigin) {
  const targetOrigin = SETTINGS.ALLOWED_ORIGIN || requestedOrigin || "*";
  const messageJson = JSON.stringify(message).replace(/</g, "\\u003c");
  const originJson = JSON.stringify(targetOrigin).replace(/</g, "\\u003c");
  return HtmlService
    .createHtmlOutput(`<!doctype html><meta charset="utf-8"><script>parent.postMessage(${messageJson},${originJson});<\/script>`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeFilename_(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}
