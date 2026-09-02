const PERSONNEL_ROWS = [
  ["Chief Mike Willis", "2675 Leyenne Rowland", "4475 Amanda Mitch-Tolle"],
  ["Deputy Chief Scott Williams", "3275 Ashley Dalton", "4575 Kaleb Brodbeck"],
  ["EMS Chief Kristin Shultz", "3375 Christian Knasel", "4675 Kasin Shultz"],
  ["Capt Jack Hood", "3475 Brittney Hughes", "4775 Kristina Hood"],
  ["FIRE Lt 2 Kris Shultz", "3575 Isaac Garrison", "4875 Ava Marosi"],
  ["FIRE Lt 3 Triston Rowland", "3675 Kadin Shultz", ""],
  ["", "3775 Lauren Kelley", ""],
  ["", "3975 Tyler Franklin", ""],
  ["", "", ""],
  ["", "", ""],
  ["1675 Dillon Gilvin", "", ""],
  ["2175 Bo Tolle", "", ""],
  ["2775 Frank Ballard", "", ""]
];

const STORAGE_KEYS = {
  draft: "ptfd-incident-draft-v1",
  settings: "ptfd-email-settings-v1"
};

const form = document.querySelector("#incident-form");
const statusMessage = document.querySelector("#status-message");
const submitButton = document.querySelector("#submit-button");
const settingsDialog = document.querySelector("#settings-dialog");
const settingsForm = document.querySelector("#settings-form");

function safeId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildPersonnelControls() {
  const grid = document.querySelector("#personnel-grid");
  const names = PERSONNEL_ROWS.flat().filter(Boolean);
  grid.innerHTML = names.map((name) => {
    const id = safeId(name);
    return `<label class="person-card">
      <input type="checkbox" name="personnel" value="${name}" aria-label="${name} was on the incident" />
      <span class="person-name">${name}</span>
      <span class="daycrew-control"><input type="checkbox" name="daycrew" value="${name}" aria-label="Circle ${name} as Daycrew" /> Daycrew</span>
    </label>`;
  }).join("");
}

function buildPersonnelReport() {
  const body = document.querySelector("#report-personnel-body");
  body.innerHTML = PERSONNEL_ROWS.map((row) => `<tr>${row.map((name) => {
    if (!name) return "<td>&nbsp;</td>";
    return `<td data-person="${name}"><span class="person-check">[&nbsp;&nbsp;]</span><span class="report-person-name">${name}</span></td>`;
  }).join("")}</tr>`).join("");
}

function getFormState() {
  const data = new FormData(form);
  const state = {};
  for (const [key, value] of data.entries()) {
    if (["incidentType", "personnel", "daycrew"].includes(key)) {
      if (!state[key]) state[key] = [];
      state[key].push(value);
    } else {
      state[key] = value;
    }
  }
  state.incidentType ||= [];
  state.personnel ||= [];
  state.daycrew ||= [];
  return state;
}

function restoreFormState(state) {
  if (!state) return;
  for (const element of form.elements) {
    if (!element.name) continue;
    const value = state[element.name];
    if (element.type === "checkbox") {
      element.checked = Array.isArray(value) && value.includes(element.value);
    } else if (element.type === "radio") {
      element.checked = value === element.value;
    } else if (typeof value === "string") {
      element.value = value;
    }
  }
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

function formatTime(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function updateReport() {
  const state = getFormState();
  document.querySelectorAll("[data-output]").forEach((element) => {
    const key = element.dataset.output;
    const value = state[key] || "";
    element.textContent = key.toLowerCase().includes("date") ? formatDate(value) : key.match(/Received|Dispatched|Enroute|Scene|Patient|Service|Quarters|Canceled|Arrive|Leave/) ? formatTime(value) : value;
  });

  document.querySelectorAll("[data-check]").forEach((element) => {
    element.innerHTML = state.incidentType.includes(element.dataset.check) ? "[X]" : "[&nbsp;&nbsp;]";
  });

  document.querySelectorAll("[data-choice-group]").forEach((element) => {
    element.classList.toggle("selected-choice", state[element.dataset.choiceGroup] === element.dataset.choice);
  });

  document.querySelectorAll("[data-person]").forEach((cell) => {
    const name = cell.dataset.person;
    cell.querySelector(".person-check").textContent = state.personnel.includes(name) ? "[X]" : "[  ]";
    cell.querySelector(".report-person-name").classList.toggle("daycrew-circle", state.daycrew.includes(name));
  });
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(getFormState()));
  const draftState = document.querySelector("#draft-state");
  draftState.textContent = "Draft saved locally";
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`.trim();
}

function currentSettings() {
  const deployed = window.PTFD_CONFIG || {};
  const local = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
  return { ...deployed, ...Object.fromEntries(Object.entries(local).filter(([, value]) => value)) };
}

function settingsAreComplete(settings) {
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(settings.appsScriptWebAppUrl || "");
}

function openSettings() {
  const settings = currentSettings();
  for (const [key, value] of Object.entries(settings)) {
    if (settingsForm.elements[key]) settingsForm.elements[key].value = value || "";
  }
  settingsDialog.showModal();
}

function reportText(state) {
  const types = state.incidentType.join(", ") || "Not marked";
  return [
    `Incident Number: 25-${state.incidentNumber || ""}`,
    `Date: ${formatDate(state.incidentDate)}`,
    `Type: ${types}`,
    `Scene Address: ${state.sceneAddress || ""}`,
    "",
    `Call Received: ${formatTime(state.callReceived)} | Dispatched: ${formatTime(state.callDispatched)} | Enroute: ${formatTime(state.enroute)} | On Scene: ${formatTime(state.onScene)}`,
    `EMS Response: ${state.emsResponse || ""} | Transport: ${state.emsTransport || ""} | Disposition: ${state.emsDisposition || ""}`,
    `Mutual Aid: ${state.mutualAidDepartment || ""} ${state.mutualAidDirection || ""} | Their Report #: ${state.mutualAidReport || ""}`,
    "",
    `Personnel: ${state.personnel.join(", ") || "None marked"}`,
    `Daycrew: ${state.daycrew.join(", ") || "None marked"}`,
    "",
    `ESO Report Done: ${state.esoReportDone || ""}`,
    `Member Making Incident Log: ${state.memberMakingLog || ""}`,
    `Log Date: ${formatDate(state.logDate)}`,
    `Pay Logged Initials: ${state.payLoggedInitials || ""}`
  ].join("\n");
}

async function generatePdf() {
  updateReport();
  if (!window.html2canvas || !window.jspdf) throw new Error("PDF tools did not load. Check the internet connection and try again.");
  await document.fonts.ready;
  const report = document.querySelector("#report-page");
  const canvas = await window.html2canvas(report, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    width: report.scrollWidth,
    height: report.scrollHeight,
    windowWidth: report.scrollWidth,
    windowHeight: report.scrollHeight
  });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter", compress: true });
  pdf.addImage(canvas.toDataURL("image/jpeg", .94), "JPEG", 0, 0, 612, 792, undefined, "FAST");
  return pdf;
}

function reportFilename() {
  const number = form.elements.incidentNumber.value.trim() || "draft";
  return `PTFD-Incident-25-${number}.pdf`;
}

async function downloadPdf() {
  const button = document.querySelector("#download-button");
  button.disabled = true;
  setStatus("Creating the one-page PDF…");
  try {
    const pdf = await generatePdf();
    pdf.save(reportFilename());
    setStatus("PDF downloaded.", "success");
  } catch (error) {
    setStatus(error.message || "The PDF could not be created.", "error");
  } finally {
    button.disabled = false;
  }
}

async function emailAndPrint(event) {
  event.preventDefault();
  setStatus("");
  if (!form.reportValidity()) return;
  if (!document.querySelector('input[name="incidentType"]:checked')) {
    setStatus("Choose at least one incident type.", "error");
    document.querySelector('input[name="incidentType"]').focus();
    return;
  }

  const settings = currentSettings();
  if (!settingsAreComplete(settings)) {
    setStatus("Complete Google email setup before submitting.", "error");
    openSettings();
    return;
  }
  submitButton.disabled = true;
  submitButton.textContent = "Sending…";
  setStatus("Creating and emailing the report…");
  try {
    const state = getFormState();
    const pdf = await generatePdf();
    const pdfBase64 = pdf.output("datauristring").split(",")[1];
    const result = await sendViaAppsScript(settings.appsScriptWebAppUrl, {
      incidentNumber: `25-${state.incidentNumber}`,
      incidentDate: formatDate(state.incidentDate),
      incidentType: state.incidentType.join(", "),
      sceneAddress: state.sceneAddress,
      reportText: reportText(state),
      attachmentFilename: reportFilename(),
      pdfBase64
    });
    setStatus(`Report emailed to ${result.recipient || "the Apps Script owner"}. Opening ${settings.printerName || "the printer"} print dialog…`, "success");
    setTimeout(() => window.print(), 350);
  } catch (error) {
    console.error(error);
    const detail = error?.text || error?.message || "Unknown email error";
    setStatus(`Report was not sent: ${detail}. Nothing was printed.`, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Email & print report";
  }
}

function sendViaAppsScript(url, submission) {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    let settled = false;
    let pollTimer;
    let activeJsonp;
    const timeout = window.setTimeout(() => {
      finish(new Error("Google did not confirm the email within 60 seconds."));
    }, 60_000);

    function finish(error, data) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.clearTimeout(pollTimer);
      window.removeEventListener("message", onMessage);
      if (activeJsonp) activeJsonp.remove();
      if (error) reject(error);
      else resolve(data);
    }

    function onMessage(event) {
      const allowedGoogleOrigin = event.origin === "https://script.google.com" || event.origin.endsWith(".googleusercontent.com");
      if (!allowedGoogleOrigin || event.data?.source !== "ptfd-apps-script" || event.data?.requestId !== requestId) return;
      if (event.data.ok) finish(null, event.data);
      else finish(new Error(event.data.error || "Google Apps Script could not send the report."));
    }

    function pollStatus() {
      if (settled) return;
      const callbackName = `ptfdStatus_${requestId.replace(/[^a-zA-Z0-9]/g, "")}`;
      window[callbackName] = (data) => {
        delete window[callbackName];
        if (activeJsonp) activeJsonp.remove();
        activeJsonp = null;
        if (data?.pending) {
          pollTimer = window.setTimeout(pollStatus, 1500);
        } else if (data?.ok) {
          finish(null, data);
        } else {
          finish(new Error(data?.error || "Google Apps Script could not send the report."));
        }
      };
      const separator = url.includes("?") ? "&" : "?";
      activeJsonp = document.createElement("script");
      activeJsonp.src = `${url}${separator}requestId=${encodeURIComponent(requestId)}&callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;
      activeJsonp.onerror = () => {
        delete window[callbackName];
        if (activeJsonp) activeJsonp.remove();
        activeJsonp = null;
        pollTimer = window.setTimeout(pollStatus, 1800);
      };
      document.head.appendChild(activeJsonp);
    }

    window.addEventListener("message", onMessage);
    const postForm = document.createElement("form");
    postForm.method = "POST";
    postForm.action = url;
    postForm.target = "ptfd-apps-script-response";
    postForm.enctype = "application/x-www-form-urlencoded";
    postForm.hidden = true;

    const payload = { ...submission };
    delete payload.pdfBase64;
    payload.requestId = requestId;
    payload.parentOrigin = window.location.origin;
    const fields = { payload: JSON.stringify(payload), pdfBase64: submission.pdfBase64 };
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      postForm.appendChild(input);
    }
    document.body.appendChild(postForm);
    postForm.submit();
    postForm.remove();
    pollTimer = window.setTimeout(pollStatus, 1200);
  });
}

function clearForm() {
  if (!window.confirm("Clear every field in this incident report?")) return;
  form.reset();
  localStorage.removeItem(STORAGE_KEYS.draft);
  if (!form.elements.incidentDate.value) form.elements.incidentDate.value = localDateValue();
  updateReport();
  setStatus("Form cleared.");
}

function localDateValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

buildPersonnelControls();
buildPersonnelReport();
restoreFormState(JSON.parse(localStorage.getItem(STORAGE_KEYS.draft) || "null"));
if (!form.elements.incidentDate.value) form.elements.incidentDate.value = localDateValue();
updateReport();

form.addEventListener("input", (event) => {
  if (event.target.name === "daycrew" && event.target.checked) {
    const attendance = [...form.querySelectorAll('input[name="personnel"]')].find((input) => input.value === event.target.value);
    if (attendance) attendance.checked = true;
  }
  updateReport();
  saveDraft();
});
form.addEventListener("change", () => { updateReport(); saveDraft(); });
form.addEventListener("submit", emailAndPrint);
document.querySelector("#download-button").addEventListener("click", downloadPdf);
document.querySelector("#print-button").addEventListener("click", () => { updateReport(); window.print(); });
document.querySelector("#clear-button").addEventListener("click", clearForm);
document.querySelector("#settings-button").addEventListener("click", openSettings);
document.querySelector("#settings-close").addEventListener("click", () => settingsDialog.close());
document.querySelector("#settings-cancel").addEventListener("click", () => settingsDialog.close());

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(settingsForm));
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(values));
  settingsDialog.close();
  setStatus("Email setup saved on this device.", "success");
});
