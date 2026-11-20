const app = document.querySelector("#app");
let currentUser = null;
let clockTimer = null;

const icons = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>',
  cargo: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  stock: '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',
  alert: '<path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3Z"/><path d="M12 9v5M12 18h.01"/>',
  audit: '<path d="M9 11h6M9 15h6M9 7h2"/><path d="M5 3h14v18H5z"/><path d="M9 3V1h6v2"/>',
  truck: '<path d="M10 17h4V5H2v12h3"/><path d="M14 9h4l4 4v4h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>',
  nodes: '<circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="m10.5 7.5-4 8M13.5 7.5l4 8M8 19h8"/>',
  pulse: '<path d="M3 12h4l2.2-6 4 12 2.2-6H21"/>',
  route: '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M8.5 17.5c3-2 1-6 4-8s4-1 5.5-4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  undo: '<path d="M9 7 4 12l5 5"/><path d="M20 17a8 8 0 0 0-8-8H4"/>',
  arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  filter: '<path d="M4 5h16M7 12h10M10 19h4"/>',
  weather: '<path d="M8 18h10a4 4 0 0 0 .4-8A6 6 0 0 0 7 8a5 5 0 0 0 1 10Z"/><path d="m9 21-1 2m5-2-1 2m5-2-1 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M15 8l3 3M17 6l2 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  logout: '<path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M8 12h10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
};

function icon(name, className = "") {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.info}</svg>`;
}

function hasView(view) {
  return Boolean(currentUser?.views?.includes(view));
}

function canPerform(action) {
  return Boolean(currentUser?.actions?.includes(action));
}

function setLoginMessage(message, tone = "error") {
  const messageElement = document.querySelector("#login-message");
  if (!messageElement) return;
  messageElement.className = `login-message login-message--${tone}`;
  messageElement.innerHTML = message ? `${icon(tone === "error" ? "alert" : "info")}<span>${escapeHtml(message)}</span>` : "";
  messageElement.hidden = !message;
}

function renderLogin(message = "", tone = "error", accountValue = "", showVerifier = false) {
  if (clockTimer) {
    window.clearInterval(clockTimer);
    clockTimer = null;
  }
  app.innerHTML = `
    <main class="login-shell">
      <section class="login-context" aria-label="Defence logistics access portal">
        <div class="login-brand"><span class="brand__mark">DL</span><div><p class="brand__name">DLCTS</p><p class="brand__sub">Defence Logistics Control</p></div></div>
        <div class="login-context__body">
          <span class="login-kicker">Verified personnel portal</span>
          <h1>One controlled view.<br/><em>Every logistics event.</em></h1>
          <p>Secure operational access for land-corridor tracking, compartment verification, stock endurance, and planner-controlled rerouting.</p>
          <div class="login-network" aria-hidden="true">
            <svg viewBox="0 0 620 210" fill="none">
              <path d="M42 145 166 74l124 58 126-82 162 85"/>
              <path class="login-network__alternate" d="m166 74 116-35 134 11"/>
              <path class="login-network__blocked" d="m290 132 126-82"/>
              <g transform="translate(42 145)"><circle r="13"/><circle r="4"/></g>
              <g transform="translate(166 74)"><circle r="13"/><circle r="4"/></g>
              <g transform="translate(290 132)"><circle r="13"/><circle r="4"/></g>
              <g transform="translate(416 50)"><circle r="13"/><circle r="4"/></g>
              <g transform="translate(578 135)"><circle r="13"/><circle r="4"/></g>
              <path class="login-network__vehicle" d="m242 101 8 13-8-3-8 3Z"/>
              <g class="login-network__alert" transform="translate(354 91)"><circle r="9"/><path d="m-3-3 6 6M3-3l-6 6"/></g>
            </svg>
          </div>
          <div class="login-roles" aria-label="Approved account types">
            <span>Army Logistics Department</span><span>Army Officer</span><span>Depot Manager</span><span>Convoy Operator</span>
          </div>
        </div>
        <p class="login-context__foot">Synthetic operational data / non-classified coordinates</p>
      </section>
      <section class="login-panel-wrap">
        <div class="login-card">
          <div class="login-card__icon">${icon("shield")}</div>
          <span class="verified-label"><i></i>Verified access only</span>
          <h2>Sign in to control</h2>
          <p class="login-card__intro">Use your issued DLCTS account credentials to continue.</p>
          <form id="login-form" novalidate>
            <label class="login-field"><span>Account ID</span><div class="login-input">${icon("user")}<input id="account-id" name="accountId" type="text" autocomplete="username" value="${escapeHtml(accountValue)}" placeholder="Enter assigned account ID" required/></div></label>
            <label class="login-field"><span>Password</span><div class="login-input">${icon("key")}<input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter password" required/><button type="button" class="password-toggle" data-toggle-password aria-label="Show password">${icon("eye")}</button></div></label>
            <div class="login-message login-message--${tone}" id="login-message" role="alert" ${message ? "" : "hidden"}>${message ? `${icon(tone === "error" ? "alert" : "info")}<span>${escapeHtml(message)}</span>` : ""}</div>
            <a class="pending-verification-link" id="pending-verification-link" href="/verify" target="_blank" rel="noopener" ${showVerifier ? "" : "hidden"}>${icon("shield")}Open prototype verification page${icon("arrow")}</a>
            <button class="login-submit" id="login-submit" type="submit"><span>Verify and continue</span>${icon("arrow")}</button>
          </form>
          <div class="create-account-prompt"><span>Need an assigned account?</span><button type="button" id="create-account-button">${icon("plus")}Create new user account</button></div>
          <div class="login-assurance"><span>${icon("lock")}Protected session</span><span>${icon("audit")}Access recorded</span></div>
          <p class="login-notice">Authorized personnel only. Account access is limited by assigned operational role.</p>
        </div>
      </section>
    </main>`;

  const form = document.querySelector("#login-form");
  const password = document.querySelector("#password");
  const toggle = document.querySelector("[data-toggle-password]");
  toggle.addEventListener("click", () => {
    const showing = password.type === "text";
    password.type = showing ? "password" : "text";
    toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    password.focus();
  });
  form.addEventListener("submit", submitLogin);
  document.querySelector("#create-account-button").addEventListener("click", renderRegistration);
}

function setRegistrationMessage(message) {
  const messageElement = document.querySelector("#registration-message");
  if (!messageElement) return;
  messageElement.innerHTML = message ? `${icon("alert")}<span>${escapeHtml(message)}</span>` : "";
  messageElement.hidden = !message;
}

function renderRegistration() {
  app.innerHTML = `
    <main class="login-shell login-shell--registration">
      <section class="login-context registration-context" aria-label="New verified-user request">
        <div class="login-brand"><span class="brand__mark">DL</span><div><p class="brand__name">DLCTS</p><p class="brand__sub">Defence Logistics Control</p></div></div>
        <div class="login-context__body">
          <span class="login-kicker">Controlled account provisioning</span>
          <h1>Request access.<br/><em>Verify before entry.</em></h1>
          <p>For this local prototype, new users continue to a self-authentication simulator. In future, verification will be completed by an authorized government or higher Army authority.</p>
          <ol class="registration-steps">
            <li><span>01</span><div><strong>Submit identity</strong><small>Provide an account ID and requested role.</small></div></li>
            <li><span>02</span><div><strong>Prototype authentication</strong><small>Authenticate the request locally for this demonstration.</small></div></li>
            <li><span>03</span><div><strong>Role-based access</strong><small>Approved accounts receive only assigned views and actions.</small></div></li>
          </ol>
        </div>
        <p class="login-context__foot">Pending accounts cannot access operational data</p>
      </section>
      <section class="login-panel-wrap registration-panel-wrap">
        <div class="login-card registration-card">
          <button class="registration-back" type="button" data-back-login>${icon("arrow")}Back to sign in</button>
          <span class="verified-label"><i></i>New personnel request</span>
          <h2>Create user account</h2>
          <p class="login-card__intro">Create the request, then continue automatically to prototype authentication.</p>
          <form id="registration-form" novalidate>
            <div class="registration-grid">
              <label class="login-field"><span>Full name</span><div class="login-input">${icon("user")}<input id="registration-name" type="text" autocomplete="name" placeholder="Enter full name" required/></div></label>
              <label class="login-field"><span>Account ID</span><div class="login-input">${icon("key")}<input id="registration-account" type="text" autocomplete="username" placeholder="e.g. officer.singh" maxlength="32" required/></div></label>
            </div>
            <label class="login-field"><span>Requested operational role</span><div class="login-input login-input--select">${icon("users")}<select id="registration-role" required><option value="">Select assigned role</option><option>Army Logistics Department</option><option>Army Officer</option><option>Depot Manager</option><option>Convoy Operator</option></select></div></label>
            <div class="registration-grid">
              <label class="login-field"><span>Password</span><div class="login-input">${icon("lock")}<input id="registration-password" type="password" autocomplete="new-password" placeholder="Create password" required/><button type="button" class="password-toggle" data-toggle-registration-password aria-label="Show passwords">${icon("eye")}</button></div></label>
              <label class="login-field"><span>Confirm password</span><div class="login-input">${icon("lock")}<input id="registration-confirm" type="password" autocomplete="new-password" placeholder="Repeat password" required/></div></label>
            </div>
            <p class="password-policy">Use 10-72 characters with uppercase, lowercase, a number, and a special character.</p>
            <div class="login-message login-message--error" id="registration-message" role="alert" hidden></div>
            <button class="login-submit" id="registration-submit" type="submit"><span>Create and continue</span>${icon("arrow")}</button>
          </form>
          <p class="login-notice">Prototype only: self-authentication is temporary. A production system must use an authorized government or higher Army verification service.</p>
        </div>
      </section>
    </main>`;

  document.querySelectorAll("[data-back-login]").forEach((button) => button.addEventListener("click", () => renderLogin()));
  document.querySelector("[data-toggle-registration-password]").addEventListener("click", (event) => {
    const fields = [document.querySelector("#registration-password"), document.querySelector("#registration-confirm")];
    const showing = fields[0].type === "text";
    fields.forEach((field) => { field.type = showing ? "password" : "text"; });
    event.currentTarget.setAttribute("aria-label", showing ? "Show passwords" : "Hide passwords");
  });
  document.querySelector("#registration-form").addEventListener("submit", submitRegistration);
}

async function submitRegistration(event) {
  event.preventDefault();
  const displayName = document.querySelector("#registration-name").value.trim();
  const accountId = document.querySelector("#registration-account").value.trim().toLowerCase();
  const role = document.querySelector("#registration-role").value;
  const password = document.querySelector("#registration-password").value;
  const confirmPassword = document.querySelector("#registration-confirm").value;
  const submit = document.querySelector("#registration-submit");

  if (!displayName || !accountId || !role || !password || !confirmPassword) {
    setRegistrationMessage("Complete every account field.");
    return;
  }
  if (!/^[a-z][a-z0-9._-]{3,31}$/.test(accountId)) {
    setRegistrationMessage("Account ID must be 4-32 lowercase letters, numbers, dots, dashes, or underscores.");
    return;
  }
  if (password !== confirmPassword) {
    setRegistrationMessage("The password confirmation does not match.");
    return;
  }
  if (password.length < 10 || password.length > 72 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    setRegistrationMessage("Use 10-72 characters with uppercase, lowercase, a number, and a special character.");
    return;
  }

  submit.disabled = true;
  submit.querySelector("span").textContent = "Submitting request...";
  setRegistrationMessage("");
  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, accountId, role, password }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setRegistrationMessage(payload.error || "The account request could not be created.");
      return;
    }
    if (payload.verificationUrl) {
      window.location.assign(payload.verificationUrl);
      return;
    }
    renderLogin("Account created. Sign-in remains blocked until an authorized government or higher Army authority verifies the request.", "info", payload.accountId);
  } catch {
    setRegistrationMessage("Secure account creation is unavailable. Start the application with run-app.bat.");
  } finally {
    if (document.body.contains(submit)) {
      submit.disabled = false;
      submit.querySelector("span").textContent = "Create and continue";
    }
  }
}

async function submitLogin(event) {
  event.preventDefault();
  const accountId = document.querySelector("#account-id").value.trim();
  const password = document.querySelector("#password").value;
  const submit = document.querySelector("#login-submit");
  if (!accountId || !password) {
    setLoginMessage("Enter both your account ID and password.");
    return;
  }
  submit.disabled = true;
  submit.querySelector("span").textContent = "Verifying access...";
  setLoginMessage("");
  document.querySelector("#pending-verification-link").hidden = true;
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, password }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setLoginMessage(payload.error || "Access could not be verified.");
      if (payload.code === "PENDING_VERIFICATION" && payload.verificationUrl) {
        const verificationLink = document.querySelector("#pending-verification-link");
        verificationLink.href = payload.verificationUrl;
        verificationLink.hidden = false;
      }
      return;
    }
    startAuthorizedApp(payload.user);
  } catch {
    setLoginMessage("Secure access is unavailable. Start the application with run-app.bat.");
  } finally {
    if (document.body.contains(submit)) {
      submit.disabled = false;
      submit.querySelector("span").textContent = "Verify and continue";
    }
  }
}

function startAuthorizedApp(user) {
  currentUser = user;
  if (!hasView(state.view)) {
    state.view = "overview";
    window.history.replaceState(null, "", "#overview");
  }
  renderShell();
  renderView();
}

async function logout() {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch {
    // Local state is cleared even if the access service has stopped.
  }
  currentUser = null;
  state.view = "overview";
  state.pendingUsers = null;
  window.history.replaceState(null, "", window.location.pathname);
  renderLogin();
}

async function authorizeSensitiveAction(action) {
  try {
    const response = await fetch("/api/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (response.ok) return true;
    const payload = await response.json();
    if (response.status === 401) {
      currentUser = null;
      renderLogin("Your secure session expired. Sign in again.");
      return false;
    }
    showToast("Restricted action", payload.error || "This action is not assigned to your role.", "lock");
    return false;
  } catch {
    showToast("Action unavailable", "The secure access service could not verify this action.", "alert");
    return false;
  }
}

async function initializeApp() {
  app.innerHTML = `<div class="app-loading" role="status"><span class="app-loading__mark">DL</span><span>Verifying secure session...</span></div>`;
  try {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      startAuthorizedApp(payload.user);
      return;
    }
    const result = new URLSearchParams(window.location.search);
    const verifiedAccount = (result.get("verified") || "").trim().toLowerCase();
    const rejectedAccount = (result.get("rejected") || "").trim().toLowerCase();
    if (/^[a-z][a-z0-9._-]{3,31}$/.test(verifiedAccount)) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
      renderLogin("Prototype authentication completed. Sign in with your new account credentials.", "info", verifiedAccount);
      return;
    }
    if (/^[a-z][a-z0-9._-]{3,31}$/.test(rejectedAccount)) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
      renderLogin("The prototype account request was cancelled and cannot sign in.", "error", rejectedAccount);
      return;
    }
    renderLogin();
  } catch {
    renderLogin("Secure access is unavailable. Start the application with run-app.bat.");
  }
}

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000);

const locations = [
  { id: "FAC-01", name: "Factory North", type: "Factory", x: 110, y: 95 },
  { id: "FAC-02", name: "Factory East", type: "Factory", x: 105, y: 415 },
  { id: "PRT-01", name: "Port Delta", type: "Port", x: 260, y: 200 },
  { id: "PRT-02", name: "Port Echo", type: "Port", x: 250, y: 405 },
  { id: "DEP-A", name: "Central Depot A", type: "Depot", x: 445, y: 135 },
  { id: "DEP-B", name: "Depot Bravo", type: "Depot", x: 450, y: 285 },
  { id: "DEP-C", name: "Depot Charlie", type: "Depot", x: 470, y: 420 },
  { id: "FBA", name: "Base Alpha", type: "Forward Base", x: 790, y: 90, alert: true },
  { id: "FBB", name: "Base Bravo", type: "Forward Base", x: 785, y: 270 },
  { id: "FBC", name: "Base Charlie", type: "Forward Base", x: 785, y: 420 },
];

const corridors = [
  ["FAC-01", "PRT-01", "active"],
  ["FAC-01", "DEP-A", "normal"],
  ["FAC-02", "PRT-02", "active"],
  ["FAC-02", "DEP-C", "normal"],
  ["PRT-01", "DEP-A", "active"],
  ["PRT-01", "DEP-B", "normal"],
  ["PRT-02", "DEP-B", "normal"],
  ["PRT-02", "DEP-C", "active"],
  ["DEP-A", "DEP-B", "normal"],
  ["DEP-A", "FBA", "blocked"],
  ["DEP-A", "FBB", "detour"],
  ["DEP-B", "FBA", "detour"],
  ["DEP-B", "FBB", "active"],
  ["DEP-C", "FBB", "detour"],
  ["DEP-C", "FBC", "active"],
];

const vehicles = [
  { id: "CNV-014", from: "Central Depot A", to: "Forward Base Alpha", cargo: "800 medical kits", compartment: "B", status: "Reroute review", tone: "pending", progress: 68, eta: "04:28", next: "Bypass Junction 2", sync: "12 sec ago", route: ["Central Depot A", "Bypass Junction 2", "Forward Base Alpha"], compartments: [{ code: "A", type: "Food rations", detail: "320 packs", color: "#688b61" }, { code: "B", type: "Medicine", detail: "800 kits", color: "#4b7d8e" }] },
  { id: "CNV-006", from: "Port Terminal Delta", to: "Forward Base Bravo", cargo: "Food and medicine", compartment: "A / B", status: "In transit", tone: "transit", progress: 54, eta: "05:05", next: "Depot Bravo", sync: "8 sec ago", route: ["Port Delta", "Depot Bravo", "Forward Base Bravo"], compartments: [{ code: "A", type: "Food rations", detail: "12.5 tons", color: "#688b61" }, { code: "B", type: "Medicine", detail: "420 kits", color: "#4b7d8e" }] },
  { id: "CNV-011", from: "Central Depot Charlie", to: "Port Terminal Delta", cargo: "Hazardous cargo", compartment: "D", status: "Unload verified", tone: "verified", progress: 100, eta: "Arrived 03:18", next: "Complete", sync: "1 min ago", route: ["Depot Charlie", "Coastal Corridor 3", "Port Delta"], compartments: [{ code: "D", type: "Hazardous cargo", detail: "14 containers", color: "#b98525" }] },
  { id: "CNV-019", from: "Sector Depot Bravo", to: "Forward Base Charlie", cargo: "War stores and fuel", compartment: "C / D", status: "Scheduled", tone: "scheduled", progress: 0, eta: "Departs in 18 hr", next: "Dispatch bay", sync: "2 min ago", route: ["Depot Bravo", "Coastal Corridor 3", "Forward Base Charlie"], compartments: [{ code: "C", type: "War stores", detail: "850 units", color: "#8b6d55" }, { code: "D", type: "Hazardous fuel", detail: "12,000 litres", color: "#b98525" }] },
  { id: "CNV-003", from: "Factory North", to: "Central Depot A", cargo: "Food rations", compartment: "A", status: "In transit", tone: "transit", progress: 76, eta: "03:58", next: "Central Depot A", sync: "16 sec ago", route: ["Factory North", "Port Delta", "Central Depot A"], compartments: [{ code: "A", type: "Food rations", detail: "18.0 tons", color: "#688b61" }] },
  { id: "CNV-008", from: "Port Terminal Echo", to: "Forward Base Bravo", cargo: "Food and medicine", compartment: "A / B", status: "Unloading", tone: "watch", progress: 100, eta: "Arrived 03:31", next: "Unload bay", sync: "20 sec ago", route: ["Port Echo", "Depot Charlie", "Forward Base Bravo"], compartments: [{ code: "A", type: "Food rations", detail: "9 crates", color: "#688b61" }, { code: "B", type: "Medicine", detail: "3 cases", color: "#4b7d8e" }] },
  { id: "CNV-017", from: "Factory East", to: "Forward Base Charlie", cargo: "War stores", compartment: "C", status: "In transit", tone: "transit", progress: 43, eta: "06:12", next: "Depot Charlie", sync: "5 sec ago", route: ["Factory East", "Depot Charlie", "Forward Base Charlie"], compartments: [{ code: "C", type: "War stores", detail: "510 units", color: "#8b6d55" }] },
  { id: "CNV-021", from: "Central Depot A", to: "Forward Base Alpha", cargo: "Food rations", compartment: "A", status: "Triage", tone: "pending", progress: 61, eta: "Under review", next: "Hold point A", sync: "11 sec ago", route: ["Central Depot A", "Hold Point A", "Forward Base Alpha"], compartments: [{ code: "A", type: "Food rations", detail: "8.0 tons", color: "#688b61" }] },
];

function makeParts(prefix, category, count, verifiedCount, compartment) {
  const parts = [];
  for (let index = 0; index < count; index += 1) {
    parts.push({
      id: `${prefix}-${String(index + 1).padStart(3, "0")}`,
      label: `${category} ${category === "Hazardous container" ? "container" : "part"} ${index + 1}`,
      category,
      compartment,
      verified: index < verifiedCount,
    });
  }
  return parts;
}

const manifests = [
  { vehicle: "CNV-011", destination: "Port Terminal Delta", arrival: "03:18", status: "Verified", tone: "verified", locked: true, parts: makeParts("HZ-D", "Hazardous container", 14, 14, "D") },
  { vehicle: "CNV-008", destination: "Forward Base Bravo", arrival: "03:31", status: "Unloading", tone: "watch", locked: true, parts: [...makeParts("FD-A", "Food ration", 9, 9, "A"), ...makeParts("MD-B", "Medical case", 3, 0, "B")] },
  { vehicle: "CNV-014", destination: "Forward Base Alpha", arrival: "In transit", status: "Manifest locked", tone: "locked", locked: true, parts: makeParts("MED-B", "Medical kit lot", 10, 0, "B") },
];

const stocks = [
  { location: "Forward Base Alpha", type: "Forward Base", commodity: "Food", stock: "12.5 tons", burn: "2.5 tons/day", days: 5.0, level: 71, status: "Safe", tone: "safe", action: "Monitor" },
  { location: "Forward Base Alpha", type: "Forward Base", commodity: "Medicine", stock: "420 kits", burn: "200 kits/day", days: 2.1, level: 30, status: "Critical", tone: "critical", action: "Dispatch 800 kits" },
  { location: "Sector Depot Bravo", type: "Depot", commodity: "War stores", stock: "850 units", burn: "125 units/day", days: 6.8, level: 82, status: "Safe", tone: "safe", action: "Monitor" },
  { location: "Sector Depot Bravo", type: "Depot", commodity: "Fuel", stock: "48,000 litres", burn: "12,000 L/day", days: 4.0, level: 57, status: "Watch", tone: "watch", action: "Schedule CNV-019" },
  { location: "Port Terminal Delta", type: "Port", commodity: "Hazardous cargo", stock: "14 containers", burn: "Transit staging", days: null, level: 100, status: "Verified", tone: "verified", action: "Receipt complete" },
  { location: "Port Terminal Delta", type: "Port", commodity: "Rations", stock: "40 tons", burn: "Transit staging", days: null, level: 80, status: "Safe", tone: "safe", action: "Available" },
  { location: "Forward Base Bravo", type: "Forward Base", commodity: "Medicine", stock: "980 kits", burn: "160 kits/day", days: 6.1, level: 76, status: "Safe", tone: "safe", action: "Monitor" },
  { location: "Forward Base Charlie", type: "Forward Base", commodity: "War stores", stock: "510 units", burn: "95 units/day", days: 5.4, level: 67, status: "Safe", tone: "safe", action: "Monitor" },
];

const triage = [
  { vehicle: "CNV-014", since: "8 min", route: "Bypass Road 2", status: "Awaiting approval" },
  { vehicle: "CNV-021", since: "7 min", route: "Coastal Corridor 3", status: "Route assigned" },
  { vehicle: "CNV-024", since: "6 min", route: "Bypass Road 2", status: "Capacity check" },
  { vehicle: "CNV-027", since: "5 min", route: "Coastal Corridor 3", status: "Route assigned" },
  { vehicle: "CNV-031", since: "4 min", route: "Bypass Road 2", status: "Pending" },
  { vehicle: "CNV-036", since: "3 min", route: "Coastal Corridor 3", status: "Pending" },
];

const events = [
  { id: "EV-2048", time: minutesAgo(2), category: "Transit", severity: "info", title: "Telemetry milestone received", detail: "CNV-003 reported approach to Central Depot A; ETA remains within plan.", asset: "CNV-003", location: "Central Depot A", actor: "Vehicle telemetry", icon: "pulse" },
  { id: "EV-2047", time: minutesAgo(4), category: "Decision", severity: "warning", title: "Detour recommendation ready", detail: "Bypass Road 2 and Coastal Corridor 3 passed capacity and cargo constraint checks.", asset: "6 convoys", location: "Land Highway 1", actor: "Decision service", icon: "route" },
  { id: "EV-2046", time: minutesAgo(6), category: "Disruption", severity: "critical", title: "Land Highway 1 blocked", detail: "Route closure recorded following a landslide and route attack report. No classified coordinates retained.", asset: "COR-10", location: "Land Highway 1", actor: "Corridor monitor", icon: "alert" },
  { id: "EV-2045", time: minutesAgo(7), category: "Disruption", severity: "warning", title: "Affected convoys entered triage", detail: "Six vehicles are held in arrival order while alternate corridor capacity is allocated.", asset: "6 convoys", location: "Central sector", actor: "Operations desk", icon: "layers" },
  { id: "EV-2044", time: minutesAgo(12), category: "Stock", severity: "critical", title: "Medicine endurance below threshold", detail: "Forward Base Alpha is at 2.1 days of medicine supply; 800 kits recommended for replenishment.", asset: "Medicine", location: "Forward Base Alpha", actor: "Stock monitor", icon: "stock" },
  { id: "EV-2043", time: minutesAgo(18), category: "Cargo", severity: "success", title: "Manifest locked for dispatch", detail: "CNV-014 Compartment B sealed with 800 medical kits after compatibility verification.", asset: "CNV-014", location: "Central Depot A", actor: "Depot Manager", icon: "lock" },
  { id: "EV-2042", time: minutesAgo(23), category: "Verification", severity: "success", title: "Unload verification complete", detail: "All 14 of 14 hazardous cargo parts confirmed at Port Terminal Delta.", asset: "CNV-011", location: "Port Terminal Delta", actor: "Convoy Operator", icon: "check" },
  { id: "EV-2041", time: minutesAgo(24), category: "Stock", severity: "success", title: "Destination stock updated", detail: "Verified CNV-011 receipt posted to Port Terminal Delta staging inventory.", asset: "14 containers", location: "Port Terminal Delta", actor: "Inventory service", icon: "stock" },
  { id: "EV-2040", time: minutesAgo(31), category: "Transit", severity: "info", title: "Vehicle arrived at destination", detail: "CNV-008 entered the unload bay at Forward Base Bravo.", asset: "CNV-008", location: "Forward Base Bravo", actor: "Arrival monitor", icon: "pin" },
  { id: "EV-2039", time: minutesAgo(45), category: "Disruption", severity: "warning", title: "Flood watch raised", detail: "Severe weather monitoring enabled on Coastal Corridor 3; corridor remains open with reduced capacity.", asset: "COR-14", location: "Coastal Corridor 3", actor: "Weather monitor", icon: "weather" },
  { id: "EV-2038", time: minutesAgo(58), category: "Disruption", severity: "critical", title: "Bridge integrity failure reported", detail: "Bridge segment isolated after infrastructure damage; two vehicles instructed to hold.", asset: "COR-08", location: "East approach", actor: "Road monitor", icon: "alert" },
  { id: "EV-2037", time: minutesAgo(63), category: "Decision", severity: "warning", title: "Safe backtrack initiated", detail: "Advance convoy returned to its last cleared waypoint after an unexpected threat report.", asset: "CNV-027", location: "East approach", actor: "Authorized Planner", icon: "undo" },
  { id: "EV-2036", time: minutesAgo(79), category: "Decision", severity: "info", title: "Previous reroute undone", detail: "Weather restriction cleared before dispatch; the most recent route decision was withdrawn.", asset: "CNV-024", location: "Bypass Road 2", actor: "Authorized Planner", icon: "undo" },
  { id: "EV-2035", time: minutesAgo(82), category: "Disruption", severity: "success", title: "Weather-blocked corridor restored", detail: "Inspection completed after flood water receded; corridor returned to normal monitoring.", asset: "COR-06", location: "West corridor", actor: "Corridor monitor", icon: "check" },
  { id: "EV-2034", time: minutesAgo(96), category: "Transit", severity: "warning", title: "ETA deviation recorded", detail: "CNV-006 reported an 11-minute delay; no dispatch plan change required.", asset: "CNV-006", location: "Depot Bravo approach", actor: "Vehicle telemetry", icon: "clock" },
  { id: "EV-2033", time: minutesAgo(118), category: "Cargo", severity: "success", title: "Segregated loading completed", detail: "Food, medicine, war stores, and hazardous cargo confirmed in isolated compartments.", asset: "CNV-019", location: "Sector Depot Bravo", actor: "Depot Manager", icon: "cargo" },
  { id: "EV-2032", time: minutesAgo(140), category: "Network", severity: "success", title: "Strategic network initialized", detail: "10 nodes and 15 land corridors loaded with capacity and hazard rules.", asset: "Network", location: "Operations control", actor: "System Operator", icon: "nodes" },
];

const state = {
  view: ["overview", "network", "cargo", "stock", "disruptions", "audit", "users"].includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "overview",
  selectedVehicle: "CNV-014",
  selectedManifest: "CNV-008",
  selectedRoute: "Bypass Road 2",
  routeDecision: null,
  decisionHistory: [],
  eventFilter: "All",
  eventSearch: "",
  dispatches: new Set(),
  pendingUsers: null,
  vehicleQuery: "",
  pathOrigin: "DEP-A",
  pathDestination: "FBA",
  plannedPath: null,
  pathError: "",
};

const viewMeta = {
  overview: ["Operational Overview", "Control tower"],
  network: ["Live Network", "Land corridor tracking"],
  cargo: ["Cargo Verification", "Compartment manifests"],
  stock: ["Stock Endurance", "Supply forecasting"],
  disruptions: ["Disruption Console", "Planner decisions"],
  audit: ["Audit Trail", "Operational events"],
  users: ["User Access", "Personnel verification"],
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function statusBadge(label, tone = "info") {
  return `<span class="status-badge status-badge--${tone}">${escapeHtml(label)}</span>`;
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function formatFullTime(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date);
}

function relativeTime(date) {
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ago`;
}

function nodeById(id) {
  return locations.find((location) => location.id === id);
}

function matchingVehicles(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return vehicles;
  return vehicles.filter((vehicle) => [vehicle.id, vehicle.from, vehicle.to, vehicle.cargo, vehicle.status, vehicle.compartment].some((value) => String(value).toLowerCase().includes(normalized)));
}

function findAvailablePath(origin, destination) {
  if (!nodeById(origin) || !nodeById(destination)) return null;
  if (origin === destination) return [origin];
  const links = {};
  locations.forEach((location) => { links[location.id] = []; });
  corridors.forEach(([from, to, status]) => {
    if (status === "blocked") return;
    links[from].push(to);
    links[to].push(from);
  });
  const open = [origin];
  const previous = { [origin]: null };
  let position = 0;
  while (position < open.length) {
    const current = open[position];
    position += 1;
    if (current === destination) break;
    links[current].forEach((next) => {
      if (Object.prototype.hasOwnProperty.call(previous, next)) return;
      previous[next] = current;
      open.push(next);
    });
  }
  if (!Object.prototype.hasOwnProperty.call(previous, destination)) return null;
  const path = [];
  for (let step = destination; step !== null; step = previous[step]) path.push(step);
  path.reverse();
  return path;
}

function pathContainsConnection(path, from, to) {
  if (!path) return false;
  for (let index = 0; index < path.length - 1; index += 1) {
    if ((path[index] === from && path[index + 1] === to) || (path[index] === to && path[index + 1] === from)) return true;
  }
  return false;
}

function addEvent(event) {
  const number = 2049 + events.filter((item) => item.id.startsWith("EV-")).length - 17;
  events.unshift({ id: `EV-${number}`, time: new Date(), ...event });
}

function showToast(title, message, iconName = "check") {
  const region = document.querySelector("#toast-region");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span class="toast__icon">${icon(iconName)}</span><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div>`;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function renderShell() {
  const navigation = [
    ["overview", "overview", "Overview"],
    ["network", "map", "Live Network"],
    ["cargo", "cargo", "Cargo Verification"],
    ["stock", "stock", "Stock Endurance"],
    ["disruptions", "alert", "Disruptions", "1"],
    ["audit", "audit", "Audit Trail"],
    ["users", "users", "User Access"],
  ].filter(([view]) => hasView(view));
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand">
          <span class="brand__mark">DL</span>
          <div><p class="brand__name">DLCTS</p><p class="brand__sub">Logistics Control</p></div>
        </div>
        <nav class="side-nav" aria-label="Primary navigation">
          <p class="side-nav__label">Operations</p>
          ${navigation.map(([view, iconName, label, count]) => `<button class="nav-button" data-view="${view}">${icon(iconName, "nav-button__icon")}<span class="nav-button__text">${label}</span>${count ? `<span class="nav-button__count">${count}</span>` : ""}</button>`).join("")}
        </nav>
        <div class="sidebar-foot">
          <div class="data-class"><span class="data-class__dot"></span>Demo data profile</div>
          <p>Synthetic locations and non-classified coordinates for operational simulation.</p>
        </div>
      </aside>
      <button class="sidebar-scrim" id="sidebar-scrim" aria-label="Close navigation"></button>
      <div class="workspace">
        <header class="topbar">
          <div class="topbar__left">
            <button class="mobile-menu" id="mobile-menu" aria-label="Open navigation">${icon("menu")}</button>
            <div class="page-context"><p class="page-context__eyebrow" id="page-eyebrow">Control tower</p><h2 class="page-context__title" id="page-title">Operational Overview</h2></div>
          </div>
          <div class="topbar__right">
            <div class="sync-state"><span class="sync-state__pulse"></span><span>Telemetry synchronized</span></div>
            <div class="clock"><strong id="clock-time">--:--:--</strong><span id="clock-date">-- --- ----</span></div>
            <div class="planner"><span class="planner__avatar">${escapeHtml(currentUser.initials)}</span><div class="planner__meta"><strong>${escapeHtml(currentUser.displayName)}</strong><span>${escapeHtml(currentUser.role)}</span></div><span class="planner__verified" title="Verified user">${icon("check")}</span><button class="logout-button" id="logout-button" aria-label="Sign out" title="Sign out">${icon("logout")}</button></div>
          </div>
        </header>
        <main class="content" id="view-root"></main>
      </div>
      <div class="toast-region" id="toast-region" aria-live="polite"></div>
    </div>`;

  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
  const sidebar = document.querySelector("#sidebar");
  const scrim = document.querySelector("#sidebar-scrim");
  const closeSidebar = () => { sidebar.classList.remove("is-open"); scrim.classList.remove("is-open"); };
  document.querySelector("#mobile-menu").addEventListener("click", () => { sidebar.classList.toggle("is-open"); scrim.classList.toggle("is-open"); });
  document.querySelector("#logout-button").addEventListener("click", logout);
  scrim.addEventListener("click", closeSidebar);
  updateClock();
  if (clockTimer) window.clearInterval(clockTimer);
  clockTimer = window.setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const time = document.querySelector("#clock-time");
  const date = document.querySelector("#clock-date");
  if (time) time.textContent = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);
  if (date) date.textContent = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(now);
}

function navigate(view) {
  if (!viewMeta[view]) return;
  if (!hasView(view)) {
    showToast("Restricted access", "This screen is not assigned to your verified role.", "lock");
    return;
  }
  state.view = view;
  window.history.replaceState(null, "", `#${view}`);
  document.querySelector("#sidebar")?.classList.remove("is-open");
  document.querySelector("#sidebar-scrim")?.classList.remove("is-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderView();
}

function viewHeader(title, copy, actions = "") {
  return `<div class="view-head"><div><h1>${title}</h1><p>${copy}</p></div>${actions ? `<div class="view-head__actions">${actions}</div>` : ""}</div>`;
}

function renderNetworkMap() {
  const corridorSvg = corridors.map(([fromId, toId, status]) => {
    const from = nodeById(fromId);
    const to = nodeById(toId);
    const highlighted = pathContainsConnection(state.plannedPath, fromId, toId);
    return `<line class="route-line route-line--${status} ${highlighted ? "route-line--searched" : ""}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/><line class="route-hit" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"><title>${from.name} to ${to.name}</title></line>`;
  }).join("");

  const nodeSvg = locations.map((node) => {
    const right = node.x > 680;
    return `<g class="node ${node.alert ? "node--alert" : ""} ${state.plannedPath?.includes(node.id) ? "node--searched" : ""}" transform="translate(${node.x} ${node.y})"><circle class="node-ring" r="19"/><circle class="node-core" r="8"/><text x="${right ? -14 : 14}" y="-3" text-anchor="${right ? "end" : "start"}">${node.name}</text><text class="node-type" x="${right ? -14 : 14}" y="10" text-anchor="${right ? "end" : "start"}">${node.type}</text></g>`;
  }).join("");

  const markerData = [
    ["CNV-014", 585, 214], ["CNV-006", 361, 249], ["CNV-011", 282, 195],
    ["CNV-019", 473, 305], ["CNV-003", 365, 145], ["CNV-017", 620, 420],
  ];
  const markers = markerData.map(([id, x, y]) => `<g class="vehicle-marker ${id === state.selectedVehicle ? "vehicle-marker--selected" : ""}" transform="translate(${x} ${y})"><path class="vehicle-marker__shape" d="M0-7 7 6 0 3-7 6Z"/><text x="11" y="4">${id.replace("CNV-", "")}</text></g>`).join("");

  return `<div class="map-scroll"><div class="map-shell">
    <svg class="network-map" viewBox="0 0 900 520" role="img" aria-label="Synthetic land corridor network with ten strategic nodes and active convoy markers">
      <path class="map-water" d="M30 330C180 300 210 360 330 340s200-80 310-32 160 22 240 4"/>
      <path class="map-contour" d="M10 60c140 45 180-25 300 0s180 25 280-10 210-5 300 40"/>
      <path class="map-contour" d="M20 465c120-55 220 5 330-25s190-30 280 5 170 15 250-20"/>
      ${corridorSvg}${nodeSvg}${markers}
      <g class="blockage-marker" transform="translate(618 105)"><circle r="11"/><path d="m-4-4 8 8M4-4l-8 8"/></g>
    </svg>
    <div class="map-overlay"><div class="map-legend">${state.plannedPath ? `<span class="legend-item"><i class="legend-line legend-line--searched"></i>Selected path</span>` : ""}<span class="legend-item"><i class="legend-line"></i>Active</span><span class="legend-item"><i class="legend-line legend-line--detour"></i>Detour</span><span class="legend-item"><i class="legend-line legend-line--blocked"></i>Blocked</span></div></div>
  </div></div>`;
}

function renderKpi(iconName, value, label, note, color, tint) {
  return `<article class="kpi" style="--kpi-color:${color};--kpi-tint:${tint}"><div class="kpi__top"><span class="kpi__icon">${icon(iconName)}</span><span class="kpi__change">${note}</span></div><div class="kpi__value">${value}</div><div class="kpi__label">${label}</div></article>`;
}

function renderStages() {
  const stages = [
    ["01", "Network initialized", "10 nodes / 15 corridors"],
    ["02", "Supply forecast", "2 signals active"],
    ["03", "Cargo loading", "19 manifests locked"],
    ["04", "Live tracking", "20 vehicles reporting"],
    ["05", "Disruption response", "6 convoys in triage"],
    ["06", "Unload and audit", "14/14 last receipt"],
  ];
  return `<section class="operational-strip" aria-label="Six-stage logistics workflow">${stages.map(([number, title, text], index) => `<div class="stage-tile ${index === 4 ? "is-current" : ""}"><span class="stage-tile__number">STAGE ${number}</span><strong>${title}</strong><span>${text}</span></div>`).join("")}</section>`;
}

function renderEventRows(list, limit = list.length) {
  return list.slice(0, limit).map((event) => `<li class="event-row event-row--${event.severity}"><span class="event-row__icon">${icon(event.icon)}</span><div><div class="event-row__head"><strong>${escapeHtml(event.title)}</strong><time datetime="${event.time.toISOString()}">${relativeTime(event.time)}</time></div><p>${escapeHtml(event.detail)}</p><div class="event-row__meta"><span>${escapeHtml(event.asset)}</span><span>${escapeHtml(event.location)}</span></div></div></li>`).join("");
}

function renderOverview() {
  const readiness = [
    ["Forward Base Alpha", "Medicine", "2.1 days", 30, "critical"],
    ["Sector Depot Bravo", "Fuel", "4.0 days", 57, "watch"],
    ["Forward Base Alpha", "Food", "5.0 days", 71, "safe"],
    ["Forward Base Charlie", "War stores", "5.4 days", 67, "safe"],
  ];
  const headerActions = `${hasView("audit") ? `<button class="button button--outline" data-go="audit">${icon("audit")}View audit</button>` : ""}${hasView("disruptions") ? `<button class="button button--dark" data-go="disruptions">${icon("alert")}Review disruption</button>` : ""}`;
  return `${viewHeader("Operational picture", "Real-time visibility across land corridors, segregated cargo, stock endurance, and planner-controlled rerouting.", headerActions)}
    <section class="kpi-grid" aria-label="Operational metrics">
      ${renderKpi("truck", "20", "Active logistics vehicles", "18 reporting", "#3b7771", "#e0efeb")}
      ${renderKpi("nodes", "10 / 15", "Strategic nodes / corridors", "Network online", "#416e86", "#e4edf2")}
      ${renderKpi("stock", "2", "Supply endurance signals", "1 critical", "#b98525", "#f8edd7")}
      ${renderKpi("alert", "6", "Convoys affected by blockage", "1 corridor", "#b94f48", "#f8e5e3")}
    </section>
    <div class="dashboard-grid">
      <section class="card card--dark span-8"><div class="card__head"><div class="card__title-wrap"><p class="card__eyebrow">Synthetic network view</p><h2 class="card__title">Live land corridor activity</h2></div><div class="card-actions">${statusBadge("18 synchronized", "active")}<button class="button button--primary button--small" data-go="network">${icon("search")}Vehicle / path search</button></div></div><div class="card__body card__body--flush">${renderNetworkMap()}</div></section>
      <section class="card span-4"><div class="alert-panel"><div class="alert-panel__top"><span class="alert-panel__icon">${icon("alert")}</span>${statusBadge("Blocked", "critical")}</div><h3>Land Highway 1</h3><p>Landslide and route attack report recorded between Central Depot A and Forward Base Alpha.</p><div class="alert-panel__meta"><div class="mini-stat"><span>Affected</span><strong>6 convoys</strong></div><div class="mini-stat"><span>Open alternatives</span><strong>2 routes</strong></div></div>${hasView("disruptions") ? `<button class="button button--danger" style="width:100%" data-go="disruptions">Open decision console ${icon("arrow")}</button>` : `<div class="restricted-note">${icon("lock")} Planner review in progress</div>`}</div></section>
      <section class="card span-7"><div class="card__head"><div class="card__title-wrap"><p class="card__eyebrow">Latest records</p><h2 class="card__title">Operational event stream</h2></div>${hasView("audit") ? `<button class="button button--ghost button--small" data-go="audit">All events ${icon("arrow")}</button>` : statusBadge("Role summary", "info")}</div><div class="card__body card__body--flush"><ul class="event-stream">${renderEventRows(events, 5)}</ul></div></section>
      <section class="card span-5"><div class="card__head"><div class="card__title-wrap"><p class="card__eyebrow">Current endurance</p><h2 class="card__title">Base and depot readiness</h2></div>${hasView("stock") ? `<button class="button button--ghost button--small" data-go="stock">Details ${icon("arrow")}</button>` : statusBadge("Summary", "info")}</div><div class="card__body card__body--flush"><ul class="readiness-list">${readiness.map(([place, commodity, value, progress, tone]) => `<li class="readiness-row"><div class="readiness-row__top"><div><h4>${place}</h4><p>${commodity}</p></div><strong>${value}</strong></div><div class="progress-track"><div class="progress-fill ${tone === "critical" ? "progress-fill--red" : tone === "watch" ? "progress-fill--amber" : ""}" style="width:${progress}%"></div></div></li>`).join("")}</ul></div></section>
      <div class="span-12">${renderStages()}</div>
    </div>`;
}

function renderVehicleDetail(vehicle) {
  const compartmentCards = vehicle.compartments.map((compartment) => `<div class="compartment" style="--compartment-color:${compartment.color}"><span class="compartment__label">Compartment ${compartment.code}</span><strong>${compartment.type}</strong><p>${compartment.detail}</p><span class="compartment__foot">${icon("lock")} Manifest locked</span></div>`).join("");
  return `<div class="vehicle-detail">
    <div class="detail-hero">
      <div class="detail-hero__top"><div><span class="eyebrow">Selected vehicle</span><h2>${vehicle.id}</h2><p>${vehicle.from} to ${vehicle.to}</p></div>${statusBadge(vehicle.status, vehicle.tone)}</div>
      <div class="telemetry-grid">
        <div class="telemetry-cell"><span>Route progress</span><strong>${vehicle.progress}%</strong></div>
        <div class="telemetry-cell"><span>ETA</span><strong>${vehicle.eta}</strong></div>
        <div class="telemetry-cell"><span>Last sync</span><strong>${vehicle.sync}</strong></div>
      </div>
    </div>
    <section class="detail-section"><h3>Active route</h3><div class="route-progress" style="--route-progress:${Math.min(vehicle.progress, 92)}%"><span class="route-progress__fill"></span>${vehicle.route.map((stop, index) => `<span class="route-stop ${index === 0 || vehicle.progress === 100 ? "is-complete" : index === 1 ? "is-current" : ""}"><i class="route-stop__dot"></i>${stop}</span>`).join("")}</div><div class="metric-line" style="margin-top:17px"><span class="caption">Next milestone</span><strong style="font-size:10px">${vehicle.next}</strong></div></section>
    <section class="detail-section"><h3>Segregated compartments</h3><div class="compartment-grid">${compartmentCards}</div></section>
    ${hasView("cargo") ? `<button class="button button--outline" data-go="cargo" data-vehicle-manifest="${vehicle.id}">${icon("cargo")}Open cargo manifest</button>` : ""}
  </div>`;
}

function renderNetwork() {
  const selected = vehicles.find((vehicle) => vehicle.id === state.selectedVehicle) || vehicles[0];
  const filteredVehicles = matchingVehicles(state.vehicleQuery);
  const locationOptions = (selectedId) => locations.map((location) => `<option value="${location.id}" ${location.id === selectedId ? "selected" : ""}>${location.name} / ${location.type}</option>`).join("");
  const pathNames = state.plannedPath?.map((id) => nodeById(id)?.name || id) || [];
  const vehicleRows = filteredVehicles.length ? filteredVehicles.map((vehicle) => `<tr data-select-vehicle="${vehicle.id}" class="${vehicle.id === selected.id ? "is-selected" : ""}" tabindex="0"><td><span class="table-primary vehicle-code">${vehicle.id}</span><span class="table-secondary">Sync ${vehicle.sync}</span></td><td><span class="table-primary">${vehicle.from}</span><span class="table-secondary">to ${vehicle.to}</span></td><td><span class="table-primary">${vehicle.cargo}</span><span class="table-secondary">Compartment ${vehicle.compartment}</span></td><td><div class="progress-label"><span>${vehicle.progress}%</span><span>${vehicle.eta}</span></div><div class="progress-track"><div class="progress-fill ${vehicle.tone === "pending" ? "progress-fill--amber" : ""}" style="width:${vehicle.progress}%"></div></div></td><td>${statusBadge(vehicle.status, vehicle.tone)}</td></tr>`).join("") : `<tr><td colspan="5"><div class="table-empty">${icon("search")}<strong>No matching vehicle</strong><span>Try a vehicle ID, cargo type, origin, destination, or status.</span></div></td></tr>`;
  return `${viewHeader("Live land network", "Track vehicle milestones between factories, ports, central depots, and forward bases. Map coordinates are synthetic and non-classified.", `<button class="button button--outline" data-network-sync>${icon("pulse")}Refresh telemetry</button>`)}
    <section class="network-query-panel">
      <div class="network-query-panel__head"><div><span class="eyebrow">Operational query</span><h2>Find a vehicle or build an available path</h2></div><span class="query-security">${icon("shield")}Synthetic network only</span></div>
      <div class="network-query-grid">
        <form class="network-query" id="vehicle-search-form">
          <div class="network-query__title"><span class="network-query__icon">${icon("truck")}</span><div><strong>Specific vehicle search</strong><small>ID, cargo, route, or status</small></div></div>
          <label class="network-query__field"><span class="sr-only">Search for a vehicle</span>${icon("search")}<input id="vehicle-search-input" type="search" list="vehicle-options" value="${escapeHtml(state.vehicleQuery)}" placeholder="Try CNV-014 or Medicine" autocomplete="off"/>${state.vehicleQuery ? `<button type="button" class="query-clear" data-clear-vehicle-search aria-label="Clear vehicle search">${icon("close")}</button>` : ""}<button type="submit" class="query-submit">Search</button></label>
          <datalist id="vehicle-options">${vehicles.map((vehicle) => `<option value="${vehicle.id}">${vehicle.from} to ${vehicle.to}</option>`).join("")}</datalist>
        </form>
        <form class="network-query" id="path-search-form">
          <div class="network-query__title"><span class="network-query__icon network-query__icon--path">${icon("route")}</span><div><strong>Custom land path</strong><small>Choose origin and destination nodes</small></div></div>
          <div class="path-inputs"><label><span>Origin</span><select id="path-origin">${locationOptions(state.pathOrigin)}</select></label><button type="button" class="path-swap" data-swap-path aria-label="Swap origin and destination">${icon("arrow")}</button><label><span>Destination</span><select id="path-destination">${locationOptions(state.pathDestination)}</select></label><button type="submit" class="query-submit query-submit--path">Find path</button></div>
        </form>
      </div>
      ${state.plannedPath ? `<div class="path-result path-result--success"><span class="path-result__icon">${icon("check")}</span><div><span>Available land path / ${Math.max(0, state.plannedPath.length - 1)} corridor${state.plannedPath.length === 2 ? "" : "s"}</span><strong>${pathNames.map(escapeHtml).join(" / ")}</strong></div><button type="button" data-clear-path>Clear path</button></div>` : state.pathError ? `<div class="path-result path-result--error"><span class="path-result__icon">${icon("alert")}</span><div><span>Path unavailable</span><strong>${escapeHtml(state.pathError)}</strong></div><button type="button" data-clear-path>Dismiss</button></div>` : ""}
    </section>
    <section class="card card--dark" style="margin-bottom:16px"><div class="card__head"><div class="card__title-wrap"><p class="card__eyebrow">Network status</p><h2 class="card__title">10 strategic nodes / 15 corridors</h2></div><div class="card-actions">${statusBadge("18 reporting", "active")}${statusBadge("1 blocked", "critical")}</div></div><div class="card__body card__body--flush">${renderNetworkMap()}</div></section>
    <div class="fleet-layout">
      <section class="card"><div class="card__head"><div class="card__title-wrap"><p class="card__eyebrow">Vehicle registry</p><h2 class="card__title">Active convoy movement</h2></div><span class="caption">${state.vehicleQuery ? `${filteredVehicles.length} matching / ` : "Showing 8 / "}20 active</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Vehicle</th><th>Route</th><th>Manifest</th><th>Progress</th><th>Status</th></tr></thead><tbody>${vehicleRows}</tbody></table></div></section>
      <aside class="card"><div class="card__body">${renderVehicleDetail(selected)}</div></aside>
    </div>`;
}

function manifestCounts(manifest) {
  const verified = manifest.parts.filter((part) => part.verified).length;
  return { verified, total: manifest.parts.length, percent: Math.round((verified / manifest.parts.length) * 100) };
}

function renderCargo() {
  const selected = manifests.find((manifest) => manifest.vehicle === state.selectedManifest) || manifests[0];
  const counts = manifestCounts(selected);
  const canVerify = selected.status === "Unloading" && canPerform("verify_cargo");
  const vehicle = vehicles.find((item) => item.id === selected.vehicle);
  return `${viewHeader("Compartment and unload verification", "Review segregated digital manifests and confirm each part only after the vehicle arrives at its destination.", hasView("audit") ? `<button class="button button--outline" data-go="audit">${icon("audit")}Verification history</button>` : "")}
    <div class="cargo-layout">
      <aside class="card"><div class="card__head"><div class="card__title-wrap"><p class="card__eyebrow">Arrival manifests</p><h2 class="card__title">Vehicles and receipts</h2></div></div><ul class="vehicle-list">${manifests.map((manifest) => { const manifestCount = manifestCounts(manifest); return `<li><button class="vehicle-row ${manifest.vehicle === selected.vehicle ? "is-selected" : ""}" data-select-manifest="${manifest.vehicle}"><div class="vehicle-row__top"><div><h4 class="vehicle-code">${manifest.vehicle}</h4><p>${manifest.destination}</p></div>${statusBadge(manifest.status, manifest.tone)}</div><div class="vehicle-row__route">${icon("cargo")}<span>${manifestCount.verified}/${manifestCount.total} parts confirmed</span></div><div class="progress-track" style="margin-top:10px"><div class="progress-fill ${manifestCount.percent < 100 ? "progress-fill--amber" : ""}" style="width:${manifestCount.percent}%"></div></div></button></li>`; }).join("")}</ul></aside>
      <section class="card"><div class="manifest-head"><div><p class="card__eyebrow">Digital manifest / ${selected.destination}</p><h2 class="card__title" style="margin-top:4px">${selected.vehicle} part-level receipt</h2><p class="caption" style="margin:6px 0 0">${vehicle ? vehicle.cargo : "Segregated cargo"} / arrival ${selected.arrival}</p></div><div class="manifest-progress"><strong>${counts.verified} / ${counts.total} verified</strong><div class="progress-track"><div class="progress-fill ${counts.percent < 100 ? "progress-fill--amber" : ""}" style="width:${counts.percent}%"></div></div></div></div>
        <ul class="manifest-list">${selected.parts.map((part) => `<li class="manifest-part"><label class="verify-check"><input type="checkbox" data-verify-part="${part.id}" ${part.verified ? "checked" : ""} ${canVerify ? "" : "disabled"}/><span>${icon("check")}</span></label><div><div class="manifest-part__top"><h4>${part.label}</h4><span class="mono caption">${part.id}</span></div><p>Compartment ${part.compartment} / ${selected.locked ? "locked manifest" : "open manifest"}</p></div><span class="part-category">${part.category}</span></li>`).join("")}</ul>
        ${counts.percent === 100 ? `<div class="completion-banner"><div class="completion-banner__copy">${icon("shield")}<div><strong>100% unload receipt confirmed</strong><span>All parts accounted for and destination stock update recorded.</span></div></div>${statusBadge("Audit recorded", "verified")}</div>` : canVerify ? `<div class="completion-banner" style="border-color:#ead8b8;background:var(--amber-soft);color:var(--amber)"><div class="completion-banner__copy">${icon("cargo")}<div><strong>${counts.total - counts.verified} parts remain</strong><span>Confirm each unloaded part to complete the digital receipt.</span></div></div></div>` : `<div class="completion-banner" style="border-color:var(--line);background:var(--surface-muted);color:var(--text-soft)"><div class="completion-banner__copy">${icon("lock")}<div><strong>Verification opens on arrival</strong><span>The locked manifest remains read-only while this vehicle is in transit.</span></div></div></div>`}
      </section>
    </div>`;
}

function renderStock() {
  const criticalRows = stocks.filter((item) => item.tone === "critical").length;
  const watchRows = stocks.filter((item) => item.tone === "watch").length;
  const canApproveDispatch = canPerform("approve_dispatch");
  return `${viewHeader("Days-of-supply endurance", "Current stock, daily consumption, predicted endurance, and exact replenishment recommendations for each logistics location.", `<button class="button button--outline" data-stock-refresh>${icon("stock")}Refresh forecast</button>`)}
    <section class="stock-summary-grid">
      <article class="stock-summary"><span class="eyebrow">Locations monitored</span><div class="stock-summary__value">10 <small>nodes</small></div></article>
      <article class="stock-summary"><span class="eyebrow">Critical endurance</span><div class="stock-summary__value" style="color:var(--red)">${criticalRows} <small>commodity</small></div></article>
      <article class="stock-summary"><span class="eyebrow">Watch threshold</span><div class="stock-summary__value" style="color:var(--amber)">${watchRows} <small>commodity</small></div></article>
    </section>
    <div class="stock-layout">
      <section class="card"><div class="card__head"><div class="card__title-wrap"><p class="card__eyebrow">Current stock picture</p><h2 class="card__title">Endurance by location and commodity</h2></div><span class="caption">Last forecast: just now</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Base / depot</th><th>Commodity stock</th><th>Daily use</th><th>Predicted endurance</th><th>Action</th></tr></thead><tbody>${stocks.map((item) => `<tr><td><span class="table-primary">${item.location}</span><span class="table-secondary">${item.type}</span></td><td><span class="table-primary">${item.commodity}</span><span class="table-secondary">${item.stock}</span></td><td>${item.burn}</td><td><div class="dos-cell">${item.days === null ? `<span class="table-primary">Transit hub</span><span class="table-secondary">No depletion forecast</span>` : `<div class="dos-value">${item.days.toFixed(1)} <span>days</span></div><div class="progress-track"><div class="progress-fill ${item.tone === "critical" ? "progress-fill--red" : item.tone === "watch" ? "progress-fill--amber" : ""}" style="width:${item.level}%"></div></div>`}</div></td><td>${statusBadge(item.status, item.tone)}<span class="table-secondary">${item.action}</span></td></tr>`).join("")}</tbody></table></div></section>
      <aside>
        <article class="recommendation-card recommendation-card--priority"><div class="recommendation-card__top"><span class="eyebrow" style="color:#eab3ae">Priority replenishment</span>${statusBadge("Critical", "critical")}</div><h3>Dispatch 800 medical kits</h3><p>Raise Forward Base Alpha from 2.1 days of medicine endurance without changing unrelated schedules.</p><div class="recommendation-card__meta"><div><span>Assigned vehicle</span><strong>CNV-014</strong></div><div><span>Compartment</span><strong>B / Medicine</strong></div><div><span>Origin</span><strong>Central Depot A</strong></div><div><span>Approval</span><strong>Planner required</strong></div></div><button class="button button--primary" data-dispatch="MED-ALPHA" ${state.dispatches.has("MED-ALPHA") || !canApproveDispatch ? "disabled" : ""}>${state.dispatches.has("MED-ALPHA") ? "Dispatch authorized" : canApproveDispatch ? "Authorize dispatch" : "Officer approval required"}</button></article>
        <article class="recommendation-card"><div class="recommendation-card__top"><span class="eyebrow" style="color:#9eafa9">Scheduled action</span>${statusBadge("Watch", "watch")}</div><h3>Prepare Convoy 019</h3><p>Sector Depot Bravo fuel endurance is 4.0 days. Dispatch is recommended in 18 hours.</p><div class="recommendation-card__meta"><div><span>Assigned vehicle</span><strong>CNV-019</strong></div><div><span>Window</span><strong>18 hours</strong></div><div><span>Cargo</span><strong>War stores / Fuel</strong></div><div><span>Status</span><strong>Scheduled</strong></div></div><button class="button button--outline" data-dispatch="BRAVO-019" ${state.dispatches.has("BRAVO-019") || !canApproveDispatch ? "disabled" : ""}>${state.dispatches.has("BRAVO-019") ? "Schedule confirmed" : canApproveDispatch ? "Confirm schedule" : "Officer approval required"}</button></article>
      </aside>
    </div>`;
}

function renderDisruptions() {
  const routes = [
    { name: "Bypass Road 2", distance: "84 km", eta: "+26 min", load: "62%", tag: "Recommended", constraints: ["Safety and capacity constraints cleared", "Medicine and cold-chain compatible", "No active weather block"] },
    { name: "Coastal Corridor 3", distance: "102 km", eta: "+41 min", load: "58%", tag: "Balanced option", constraints: ["Safety and capacity constraints cleared", "Hazardous-goods compatible", "Flood watch monitoring active"] },
  ];
  const currentDecision = state.routeDecision;
  return `${viewHeader("Blocked-route decision console", "Compare safe alternate corridors, distribute affected vehicles without herding, and require authorized planner approval before any dispatch change.", `<button class="button button--outline" data-decision="undo" ${state.decisionHistory.length === 0 || !canPerform("undo_decision") ? "disabled" : ""}>${icon("undo")}Undo last decision</button>`)}
    <div class="disruption-layout">
      <div>
        <section class="disruption-hero">
          <div class="disruption-hero__header"><div><span class="eyebrow" style="color:var(--red)">Active disruption / DS-026</span><h2>Land Highway 1 unavailable</h2><p>A closure was recorded between Central Depot A and Forward Base Alpha after a landslide and route attack report. The affected segment remains isolated pending corridor clearance.</p></div>${statusBadge("Blocked", "critical")}</div>
          <div class="alert-panel__meta" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:0"><div class="mini-stat"><span>Reported</span><strong>${formatTime(events.find((event) => event.id === "EV-2046")?.time || new Date())}</strong></div><div class="mini-stat"><span>Affected</span><strong>6 convoys</strong></div><div class="mini-stat"><span>Alternatives</span><strong>2 open</strong></div><div class="mini-stat"><span>Target balance</span><strong>76%</strong></div></div>
        </section>
        <section class="card" style="margin-top:16px"><div class="card__head"><div class="card__title-wrap"><p class="card__eyebrow">Route trade-offs</p><h2 class="card__title">Safe contingency options</h2></div><span class="caption">Hard constraints checked before approval</span></div><div class="card__body">
          <div class="route-cards">${routes.map((route) => `<article class="route-card ${state.selectedRoute === route.name ? "is-selected" : ""}"><div class="route-card__top"><h3>${route.name}</h3><span class="route-card__tag">${route.tag}</span></div><div class="route-metrics"><div class="route-metric"><span>Distance</span><strong>${route.distance}</strong></div><div class="route-metric"><span>ETA impact</span><strong>${route.eta}</strong></div><div class="route-metric"><span>Corridor load</span><strong>${route.load}</strong></div></div><ul class="constraint-list">${route.constraints.map((constraint) => `<li class="constraint-item">${icon("check")} ${constraint}</li>`).join("")}</ul><button class="button ${state.selectedRoute === route.name ? "button--dark" : "button--outline"}" style="width:100%" data-route-option="${route.name}">${state.selectedRoute === route.name ? "Selected for review" : "Select route"}</button></article>`).join("")}</div>
          <div class="decision-bar"><div class="decision-bar__copy"><strong>${currentDecision ? currentDecision.type === "approved" ? `${currentDecision.route} approved` : "Convoys held for review" : `${state.selectedRoute} ready for planner review`}</strong><span>${currentDecision ? `Decision recorded at ${formatTime(currentDecision.at)} by ${escapeHtml(currentUser.displayName)}.` : "No vehicle route changes until an authorized decision is recorded."}</span></div><div class="button-row"><button class="button button--outline" data-decision="hold" ${canPerform("approve_reroute") ? "" : "disabled"}>Hold vehicles</button><button class="button button--primary" data-decision="approve" ${currentDecision?.type === "approved" && currentDecision.route === state.selectedRoute || !canPerform("approve_reroute") ? "disabled" : ""}>${icon("shield")}Approve reroute</button></div></div>
        </div></section>
      </div>
      <aside class="card"><div class="card__head"><div class="card__title-wrap"><p class="card__eyebrow">Disruption triage</p><h2 class="card__title">Affected convoy order</h2></div>${statusBadge("6 vehicles", "pending")}</div><div>${triage.map((item, index) => `<div class="triage-row"><div class="triage-row__top"><div class="triage-row__main"><span class="triage-position">${String(index + 1).padStart(2, "0")}</span><div class="triage-row__copy"><strong class="vehicle-code">${item.vehicle}</strong><span>Waiting ${item.since}</span></div></div>${statusBadge(index < 2 ? "Assigned" : "Waiting", index < 2 ? "rerouted" : "pending")}</div><div class="triage-row__route">Proposed: ${item.route} / ${item.status}</div></div>`).join("")}</div><div class="card__body" style="border-top:1px solid var(--line)"><p class="caption" style="margin:0">Vehicles are reviewed in arrival order and distributed across both viable corridors to avoid capacity overload.</p></div></aside>
    </div>`;
}

function filteredEvents() {
  const query = state.eventSearch.trim().toLowerCase();
  return events.filter((event) => {
    const categoryMatch = state.eventFilter === "All" || event.category === state.eventFilter;
    const searchMatch = !query || [event.id, event.category, event.title, event.detail, event.asset, event.location, event.actor].some((value) => String(value).toLowerCase().includes(query));
    return categoryMatch && searchMatch;
  });
}

function renderAuditItems(list) {
  if (!list.length) return `<li class="empty-state">${icon("search")}<strong>No matching events</strong><p>Change the category or search term to view other records.</p></li>`;
  return list.map((event) => `<li class="audit-item audit-item--${event.severity}"><time class="audit-item__time" datetime="${event.time.toISOString()}">${formatTime(event.time)}</time><span class="audit-item__type">${escapeHtml(event.category)}</span><div class="audit-item__event"><strong>${escapeHtml(event.title)}</strong><span><span class="event-code">${event.id}</span> / ${escapeHtml(event.detail)}</span></div><span class="audit-item__actor">${escapeHtml(event.actor)}<br/>${escapeHtml(event.asset)}</span></li>`).join("");
}

function renderEventCatalog() {
  const catalog = [
    ["Network and stock", ["Node and corridor initialized", "Capacity or hazard status changed", "Consumption and endurance updated", "Threshold and replenishment raised"]],
    ["Cargo and transit", ["Compartment loaded and checked", "Manifest locked", "Departure and checkpoint passed", "Telemetry, ETA, and arrival updated"]],
    ["Disruption and decision", ["Attack, roadblock, or threat reported", "Weather, flood, or landslide reported", "Road or bridge damage reported", "Detour approved, held, undone, or cleared"]],
    ["Receipt and audit", ["Part scanned and verified", "Unload receipt completed", "Destination stock updated", "Planner and user-access decisions recorded"]],
  ];
  return `<div class="event-catalog">${catalog.map(([title, items]) => `<section class="catalog-group"><h3>${title}</h3><ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul></section>`).join("")}</div>`;
}

function renderAudit() {
  const categories = ["All", "Network", "Stock", "Cargo", "Transit", "Disruption", "Decision", "Verification", "Access"];
  const list = filteredEvents();
  return `${viewHeader("Auditable event trail", "Every network update, vehicle milestone, manifest change, stock forecast, route decision, and unload receipt is presented as a traceable operational record.", `<button class="button button--outline" data-audit-export>${icon("audit")}Prepare event summary</button>`)}
    <section class="card" style="margin-bottom:16px"><div class="audit-toolbar"><div class="segmented" role="group" aria-label="Filter events by category">${categories.map((category) => `<button class="segment-button ${state.eventFilter === category ? "is-active" : ""}" data-event-filter="${category}">${category}</button>`).join("")}</div><label class="search-box">${icon("search")}<span class="sr-only">Search events</span><input id="event-search" type="search" value="${escapeHtml(state.eventSearch)}" placeholder="Search event, vehicle, or location" autocomplete="off"/></label></div><div class="audit-count" id="audit-count" style="padding:0 18px 10px">${list.length} records shown</div><ol class="audit-timeline" id="audit-list">${renderAuditItems(list)}</ol></section>
    <section class="card"><div class="card__head"><div class="card__title-wrap"><p class="card__eyebrow">Tracked lifecycle coverage</p><h2 class="card__title">Operational event catalog</h2></div><span class="caption">Report-defined event classes</span></div><div class="card__body">${renderEventCatalog()}</div></section>`;
}

function updateAuditResults() {
  const list = filteredEvents();
  const timeline = document.querySelector("#audit-list");
  const count = document.querySelector("#audit-count");
  if (timeline) timeline.innerHTML = renderAuditItems(list);
  if (count) count.textContent = `${list.length} records shown`;
}

function formatAccountDate(value) {
  if (!value) return "Submitted recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Submitted recently";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function renderPendingUserList() {
  if (state.pendingUsers === null) {
    return `<div class="access-loading"><span class="sync-state__pulse"></span><strong>Loading account requests...</strong></div>`;
  }
  if (!state.pendingUsers.length) {
    return `<div class="empty-state">${icon("shield")}<strong>No pending account requests</strong><p>New personnel registrations will appear here for verification.</p></div>`;
  }
  return `<div class="user-request-list">${state.pendingUsers.map((user) => `<article class="user-request" data-user-card="${escapeHtml(user.accountId)}"><div class="user-request__identity"><span class="user-request__avatar">${escapeHtml(user.initials)}</span><div><div class="user-request__name"><strong>${escapeHtml(user.displayName)}</strong>${statusBadge("Pending", "pending")}</div><span class="mono">${escapeHtml(user.accountId)}</span></div></div><div class="user-request__details"><div><span>Requested role</span><strong>${escapeHtml(user.role)}</strong></div><div><span>Department</span><strong>${escapeHtml(user.department)}</strong></div><div><span>Submitted</span><strong>${escapeHtml(formatAccountDate(user.createdAt))}</strong></div></div><div class="user-request__actions"><button class="button button--outline" data-user-decision="reject" data-account-id="${escapeHtml(user.accountId)}">Reject</button><button class="button button--primary" data-user-decision="approve" data-account-id="${escapeHtml(user.accountId)}">${icon("shield")}Verify account</button></div></article>`).join("")}</div>`;
}

function renderUsers() {
  const pendingCount = state.pendingUsers === null ? 0 : state.pendingUsers.length;
  const roles = [
    ["Army Logistics Department", "Full logistics control and personnel verification"],
    ["Army Officer", "Planning, dispatch, and reroute approval"],
    ["Depot Manager", "Cargo verification and stock visibility"],
    ["Convoy Operator", "Vehicle movement and destination receipt"],
  ];
  return `${viewHeader("Personnel access verification", "Review new account requests and activate only personnel whose identity and assigned logistics role have been confirmed.", `<button class="button button--outline" data-users-refresh>${icon("pulse")}Refresh requests</button>`)}
    <section class="access-summary-grid"><article class="stock-summary"><span class="eyebrow">Pending verification</span><div class="stock-summary__value" id="pending-user-count">${pendingCount} <small>requests</small></div></article><article class="stock-summary"><span class="eyebrow">Approved role profiles</span><div class="stock-summary__value">4 <small>roles</small></div></article><article class="stock-summary"><span class="eyebrow">Verification authority</span><div class="stock-summary__value access-authority">Logistics <small>only</small></div></article></section>
    <div class="dashboard-grid">
      <section class="card span-8"><div class="card__head"><div class="card__title-wrap"><p class="card__eyebrow">Identity requests</p><h2 class="card__title">Accounts awaiting verification</h2></div><span class="status-badge status-badge--${pendingCount ? "pending" : "safe"}" id="pending-user-badge">${pendingCount} pending</span></div><div id="pending-users-container">${renderPendingUserList()}</div></section>
      <aside class="card span-4"><div class="card__head"><div class="card__title-wrap"><p class="card__eyebrow">Least-privilege access</p><h2 class="card__title">Role assignment guide</h2></div>${icon("shield", "icon-box")}</div><div class="card__body"><div class="role-profile-list">${roles.map(([role, description]) => `<div class="role-profile"><span>${icon("user")}</span><div><strong>${role}</strong><p>${description}</p></div></div>`).join("")}</div><div class="access-policy-note">${icon("lock")}<p><strong>Verification required</strong><span>New accounts cannot sign in until an authorized Logistics controller approves the request.</span></p></div></div></aside>
    </div>`;
}

function bindUserDecisionEvents() {
  document.querySelectorAll("[data-user-decision]").forEach((button) => button.addEventListener("click", () => decideUser(button.dataset.accountId, button.dataset.userDecision)));
}

async function loadPendingUsers() {
  const container = document.querySelector("#pending-users-container");
  if (!container || state.view !== "users") return;
  try {
    const response = await fetch("/api/users/pending", { cache: "no-store" });
    const payload = await response.json();
    if (response.status === 401) {
      currentUser = null;
      renderLogin("Your secure session expired. Sign in again.");
      return;
    }
    if (!response.ok) throw new Error(payload.error || "Account requests could not be loaded.");
    state.pendingUsers = payload.pendingUsers;
    if (!document.body.contains(container)) return;
    container.innerHTML = renderPendingUserList();
    const count = document.querySelector("#pending-user-count");
    if (count) count.innerHTML = `${state.pendingUsers.length} <small>requests</small>`;
    const badge = document.querySelector("#pending-user-badge");
    if (badge) {
      badge.textContent = `${state.pendingUsers.length} pending`;
      badge.className = `status-badge status-badge--${state.pendingUsers.length ? "pending" : "safe"}`;
    }
    bindUserDecisionEvents();
  } catch (error) {
    if (document.body.contains(container)) container.innerHTML = `<div class="empty-state">${icon("alert")}<strong>Requests unavailable</strong><p>${escapeHtml(error.message || "Try refreshing the account requests.")}</p></div>`;
  }
}

async function decideUser(accountId, decision) {
  if (decision === "reject" && !window.confirm(`Reject the account request for ${accountId}?`)) return;
  const card = document.querySelector(`[data-user-card="${CSS.escape(accountId)}"]`);
  card?.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  try {
    const response = await fetch("/api/users/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, decision }),
    });
    const payload = await response.json();
    if (response.status === 401) {
      currentUser = null;
      renderLogin("Your secure session expired. Sign in again.");
      return;
    }
    if (!response.ok) throw new Error(payload.error || "The account decision could not be recorded.");
    addEvent({ category: "Access", severity: decision === "approve" ? "success" : "warning", title: decision === "approve" ? "Personnel account verified" : "Personnel account request rejected", detail: `${accountId} was ${decision === "approve" ? "activated" : "rejected"} by Logistics Operations.`, asset: accountId, location: "User Access", actor: currentUser.displayName, icon: decision === "approve" ? "shield" : "close" });
    showToast(decision === "approve" ? "Account verified" : "Request rejected", decision === "approve" ? `${accountId} can now sign in.` : `${accountId} was not activated.`, decision === "approve" ? "shield" : "close");
    await loadPendingUsers();
  } catch (error) {
    showToast("Decision not saved", error.message || "Try the verification action again.", "alert");
    card?.querySelectorAll("button").forEach((button) => { button.disabled = false; });
  }
}

async function approveDispatch(code) {
  if (!canPerform("approve_dispatch")) {
    showToast("Approval required", "Your verified role cannot authorize dispatch changes.", "lock");
    return;
  }
  if (!await authorizeSensitiveAction("approve_dispatch")) return;
  if (state.dispatches.has(code)) return;
  state.dispatches.add(code);
  if (code === "MED-ALPHA") {
    addEvent({ category: "Stock", severity: "success", title: "Medical replenishment authorized", detail: "Dispatch of 800 medical kits to Forward Base Alpha approved for CNV-014 Compartment B.", asset: "CNV-014", location: "Central Depot A", actor: currentUser.displayName, icon: "shield" });
    showToast("Dispatch authorized", "CNV-014 assigned 800 medical kits for Forward Base Alpha.", "shield");
  } else {
    addEvent({ category: "Stock", severity: "success", title: "Replenishment schedule confirmed", detail: "CNV-019 preparation window confirmed for dispatch from Sector Depot Bravo in 18 hours.", asset: "CNV-019", location: "Sector Depot Bravo", actor: currentUser.displayName, icon: "clock" });
    showToast("Schedule confirmed", "CNV-019 remains scheduled for the 18-hour dispatch window.", "clock");
  }
  renderView();
}

async function recordRouteDecision(type) {
  const requiredAction = type === "undo" ? "undo_decision" : "approve_reroute";
  if (!canPerform(requiredAction)) {
    showToast("Approval required", "Your verified role cannot change planner decisions.", "lock");
    return;
  }
  if (!await authorizeSensitiveAction(requiredAction)) return;
  if (type === "undo") {
    const previous = state.decisionHistory.pop();
    if (!previous) return;
    const undone = state.routeDecision;
    state.routeDecision = previous.decision;
    state.selectedRoute = previous.selectedRoute;
    addEvent({ category: "Decision", severity: "warning", title: "Planner route decision undone", detail: `${undone?.route || "The latest route change"} was withdrawn; affected vehicles remain under planner control.`, asset: "6 convoys", location: "Land Highway 1", actor: currentUser.displayName, icon: "undo" });
    showToast("Decision undone", "The previous planner state has been restored.", "undo");
    renderView();
    return;
  }

  state.decisionHistory.push({ decision: state.routeDecision, selectedRoute: state.selectedRoute });
  if (type === "approve") {
    state.routeDecision = { type: "approved", route: state.selectedRoute, at: new Date() };
    addEvent({ category: "Decision", severity: "success", title: "Anti-herding reroute approved", detail: `${state.selectedRoute} approved as part of the balanced assignment for six affected convoys.`, asset: "6 convoys", location: state.selectedRoute, actor: currentUser.displayName, icon: "shield" });
    showToast("Reroute approved", `${state.selectedRoute} recorded for the affected convoy allocation.`, "shield");
  } else {
    state.routeDecision = { type: "held", route: state.selectedRoute, at: new Date() };
    addEvent({ category: "Decision", severity: "warning", title: "Affected convoys held", detail: "Planner retained all six vehicles at safe hold points pending updated corridor conditions.", asset: "6 convoys", location: "Central sector", actor: currentUser.displayName, icon: "clock" });
    showToast("Vehicles held", "The six affected convoys remain at safe hold points.", "clock");
  }
  renderView();
}

async function verifyManifestPart(partId, checked) {
  if (!canPerform("verify_cargo")) {
    showToast("Restricted action", "Cargo verification is not assigned to your role.", "lock");
    return;
  }
  if (!await authorizeSensitiveAction("verify_cargo")) {
    renderView();
    return;
  }
  const manifest = manifests.find((item) => item.vehicle === state.selectedManifest);
  const part = manifest?.parts.find((item) => item.id === partId);
  if (!manifest || !part || manifest.status !== "Unloading") return;
  part.verified = checked;
  if (checked) {
    addEvent({ category: "Verification", severity: "success", title: "Cargo part verified", detail: `${part.label} confirmed against the locked manifest for ${manifest.vehicle}.`, asset: part.id, location: manifest.destination, actor: currentUser.displayName, icon: "check" });
  } else {
    addEvent({ category: "Verification", severity: "warning", title: "Cargo verification corrected", detail: `${part.label} was returned to pending review on the digital manifest for ${manifest.vehicle}.`, asset: part.id, location: manifest.destination, actor: currentUser.displayName, icon: "undo" });
  }
  const counts = manifestCounts(manifest);
  if (counts.verified === counts.total) {
    manifest.status = "Verified";
    manifest.tone = "verified";
    const linkedVehicle = vehicles.find((vehicle) => vehicle.id === manifest.vehicle);
    if (linkedVehicle) { linkedVehicle.status = "Unload verified"; linkedVehicle.tone = "verified"; }
    addEvent({ category: "Verification", severity: "success", title: "Unload verification complete", detail: `All ${counts.total} of ${counts.total} parts confirmed at ${manifest.destination}.`, asset: manifest.vehicle, location: manifest.destination, actor: currentUser.displayName, icon: "shield" });
    addEvent({ category: "Stock", severity: "success", title: "Destination stock updated", detail: `Verified ${manifest.vehicle} receipt posted to destination inventory.`, asset: manifest.vehicle, location: manifest.destination, actor: "Inventory service", icon: "stock" });
    showToast("Unload complete", `All ${counts.total} parts were verified and recorded.`, "shield");
  }
  renderView();
}

function bindViewEvents() {
  document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.vehicleManifest && manifests.some((manifest) => manifest.vehicle === button.dataset.vehicleManifest)) state.selectedManifest = button.dataset.vehicleManifest;
    navigate(button.dataset.go);
  }));

  document.querySelectorAll("[data-select-vehicle]").forEach((row) => {
    const select = () => { state.selectedVehicle = row.dataset.selectVehicle; renderView(); };
    row.addEventListener("click", select);
    row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } });
  });

  document.querySelectorAll("[data-select-manifest]").forEach((button) => button.addEventListener("click", () => { state.selectedManifest = button.dataset.selectManifest; renderView(); }));
  document.querySelectorAll("[data-verify-part]").forEach((checkbox) => checkbox.addEventListener("change", () => verifyManifestPart(checkbox.dataset.verifyPart, checkbox.checked)));
  document.querySelectorAll("[data-dispatch]").forEach((button) => button.addEventListener("click", () => approveDispatch(button.dataset.dispatch)));
  document.querySelectorAll("[data-route-option]").forEach((button) => button.addEventListener("click", () => { state.selectedRoute = button.dataset.routeOption; renderView(); }));
  document.querySelectorAll("[data-decision]").forEach((button) => button.addEventListener("click", () => recordRouteDecision(button.dataset.decision)));
  document.querySelectorAll("[data-event-filter]").forEach((button) => button.addEventListener("click", () => { state.eventFilter = button.dataset.eventFilter; renderView(); }));

  document.querySelector("#event-search")?.addEventListener("input", (event) => { state.eventSearch = event.target.value; updateAuditResults(); });
  document.querySelector("#vehicle-search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = document.querySelector("#vehicle-search-input").value.trim();
    state.vehicleQuery = query;
    const matches = matchingVehicles(query);
    if (matches.length) state.selectedVehicle = matches[0].id;
    renderView();
    showToast(matches.length ? "Vehicle located" : "No vehicle found", matches.length ? `${matches[0].id} selected; ${matches.length} matching record${matches.length === 1 ? "" : "s"}.` : "Try another vehicle ID, route, cargo type, or status.", matches.length ? "truck" : "search");
  });
  document.querySelector("[data-clear-vehicle-search]")?.addEventListener("click", () => {
    state.vehicleQuery = "";
    renderView();
  });

  const planPath = (origin, destination) => {
    state.pathOrigin = origin;
    state.pathDestination = destination;
    state.plannedPath = findAvailablePath(origin, destination);
    state.pathError = state.plannedPath ? "" : "No open land path connects the selected nodes under current corridor conditions.";
    renderView();
    const originName = nodeById(origin)?.name || origin;
    const destinationName = nodeById(destination)?.name || destination;
    showToast(state.plannedPath ? "Available path highlighted" : "Path unavailable", state.plannedPath ? `${originName} to ${destinationName} uses ${Math.max(0, state.plannedPath.length - 1)} open corridor${state.plannedPath.length === 2 ? "" : "s"}.` : state.pathError, state.plannedPath ? "route" : "alert");
  };
  document.querySelector("#path-search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    planPath(document.querySelector("#path-origin").value, document.querySelector("#path-destination").value);
  });
  document.querySelector("[data-swap-path]")?.addEventListener("click", () => {
    const origin = document.querySelector("#path-origin").value;
    const destination = document.querySelector("#path-destination").value;
    planPath(destination, origin);
  });
  document.querySelector("[data-clear-path]")?.addEventListener("click", () => {
    state.plannedPath = null;
    state.pathError = "";
    renderView();
  });
  document.querySelector("[data-network-sync]")?.addEventListener("click", () => {
    addEvent({ category: "Transit", severity: "info", title: "Telemetry snapshot synchronized", detail: "Latest reporting status received from 18 of 20 active logistics vehicles.", asset: "18 vehicles", location: "Land network", actor: "Operations desk", icon: "pulse" });
    showToast("Telemetry refreshed", "18 of 20 active vehicles are synchronized.", "pulse");
  });
  document.querySelector("[data-stock-refresh]")?.addEventListener("click", () => {
    addEvent({ category: "Stock", severity: "info", title: "Stock endurance refreshed", detail: "Latest stock levels and daily consumption readings synchronized for all monitored locations.", asset: "10 nodes", location: "Supply network", actor: "Operations desk", icon: "stock" });
    showToast("Forecast refreshed", "Endurance values are current for all monitored locations.", "stock");
  });
  document.querySelector("[data-audit-export]")?.addEventListener("click", () => showToast("Summary prepared", `${filteredEvents().length} visible event records included in the on-screen summary.`, "audit"));
  document.querySelector("[data-users-refresh]")?.addEventListener("click", loadPendingUsers);
  if (state.view === "users") loadPendingUsers();
}

function renderView() {
  const root = document.querySelector("#view-root");
  if (!currentUser || !hasView(state.view)) {
    if (currentUser) navigate("overview");
    return;
  }
  const renderer = {
    overview: renderOverview,
    network: renderNetwork,
    cargo: renderCargo,
    stock: renderStock,
    disruptions: renderDisruptions,
    audit: renderAudit,
    users: renderUsers,
  }[state.view];
  if (!root || !renderer) return;
  root.innerHTML = renderer();
  document.querySelectorAll(".nav-button").forEach((button) => button.classList.toggle("is-active", button.dataset.view === state.view));
  document.querySelector("#page-title").textContent = viewMeta[state.view][0];
  document.querySelector("#page-eyebrow").textContent = viewMeta[state.view][1];
  document.title = `${viewMeta[state.view][0]} | DLCTS`;
  bindViewEvents();
}

initializeApp();
