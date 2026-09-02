# PTFD Incident Report web app

This is a static web app designed for GitHub Pages. It reproduces the Pleasant Township Fire Department incident sheet as a one-page US Letter report, keeps an in-progress draft on the device, creates a PDF, emails it through Google Apps Script, and then opens printing.

## How delivery works

The Google Apps Script project runs as its owner. When a report is submitted, it:

1. Verifies the required incident information and website origin.
2. Sends the completed report from the Google account that owns the script.
3. Sends the primary copy to `ptfdclarkoh@gmail.com`.
4. Attaches the exact one-page report as a PDF.
5. Confirms success to the web app. Printing starts only after that confirmation.

## Create the Google Apps Script mailer

1. Sign into the Google account that should send and receive these reports.
2. Open [Google Apps Script](https://script.google.com/) and create a **New project**.
3. Delete the starter code and paste in everything from `GoogleAppsScript.gs`.
4. `PRIMARY_RECIPIENT` is already set to `ptfdclarkoh@gmail.com`. Change it only if the department's destination changes.
5. After the GitHub Pages site is published, set `ALLOWED_ORIGIN` to its origin. For a normal project site this is `https://YOUR-USERNAME.github.io`—do not add the repository path or a trailing slash.
6. Save the project and name it **PTFD Incident Report Mailer**.
7. Choose **Deploy → New deployment → Web app**.
8. Set **Execute as** to **Me**. Choose the narrowest access option that still covers the people who will use the incident form. A Google Workspace organization-only deployment is preferable when everyone has a department account.
9. Select **Deploy**, approve the requested email permission, and copy the deployed URL ending in `/exec`.

Whenever `GoogleAppsScript.gs` is changed later, edit the existing deployment and create a new version. Saving the code alone does not update the live `/exec` deployment.

## Connect the website

Open the incident-report app, choose **Google email setup**, paste the Apps Script `/exec` URL, and save. That URL is kept in the browser on that device.

The current deployment URL is already saved in `config.js`, so the published app is preconfigured for the department account.

For a department-wide fixed setup, paste the URL into `config.js` before publishing:

```js
window.PTFD_CONFIG = {
  appsScriptWebAppUrl: "https://script.google.com/macros/s/YOUR-DEPLOYMENT-ID/exec",
  printerName: "Xerox AltaLink C8045"
};
```

## Xerox AltaLink C8045 printing

Normal browser security does not let a website silently select a printer. After Google confirms the email was sent, the app opens the system print dialog. Choose **Xerox AltaLink C8045**, Letter paper, portrait, 100% scale, and disable browser headers and footers.

For a dedicated station that must print without a dialog:

1. Install the Xerox AltaLink C8045 in Windows and make it the default printer.
2. Open the published app in Chrome or Edge kiosk-printing mode on that locked-down station.
3. Test with a clearly marked non-emergency sample report before operational use.

Kiosk printing sends the report to the workstation's default printer, so the department must control that workstation and printer configuration.

## Publish with GitHub Pages

1. Create a GitHub repository and upload `index.html`, `styles.css`, `app.js`, `config.js`, `GoogleAppsScript.gs`, and `PTFDLOGO.png`.
2. In the repository, open **Settings → Pages**.
3. Choose **Deploy from a branch**, select the main branch and `/ (root)`, then save.
4. Copy the published origin into `SETTINGS.ALLOWED_ORIGIN` in Apps Script and redeploy it.
5. Open the GitHub Pages site, complete **Google email setup**, and send a non-emergency test report.

## Security and operational notes

- Incident data is not written to GitHub. Draft data and the Apps Script URL use browser local storage.
- The Apps Script must be deployed with permission to send mail from its owner account.
- Restrict deployment access to the department's Google Workspace organization when practical.
- `ALLOWED_ORIGIN` prevents accidental use from another site, but it is not a replacement for Google account access controls.
- Google Apps Script email quotas apply to the account that owns the script.
- Internet access is required for PDF generation and email delivery.
- If Google reports an email failure or does not confirm within 45 seconds, printing does not begin.
- Use **Download PDF** when a report needs to be saved without emailing it.
