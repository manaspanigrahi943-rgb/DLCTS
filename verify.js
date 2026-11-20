const requestList = document.querySelector("#request-list");
const pendingCount = document.querySelector("#pending-count");
const refreshButton = document.querySelector("#refresh-button");
const toastRegion = document.querySelector("#toast-region");
const requestedAccount = (new URLSearchParams(window.location.search).get("accountId") || "").trim().toLowerCase();

const shieldIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></svg>';
const emptyIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11h6M9 15h6M9 7h2"/><path d="M5 3h14v18H5z"/><path d="M9 3V1h6v2"/></svg>';
const alertIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3Z"/><path d="M12 9v5M12 18h.01"/></svg>';

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function showToast(title, message) {
  toastRegion.innerHTML = `<div class="toast">${shieldIcon}<div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div></div>`;
  window.setTimeout(() => { toastRegion.innerHTML = ""; }, 4200);
}

function renderRequests(users) {
  pendingCount.textContent = String(users.length);
  if (!users.length) {
    requestList.innerHTML = `<div class="empty-state">${emptyIcon}<strong>${requestedAccount ? "Account request not pending" : "No accounts awaiting verification"}</strong><p>${requestedAccount ? "This request may already be approved, rejected, or unavailable. Return to DLCTS sign-in to continue." : "New user requests will appear here automatically. Approved users can return to the main DLCTS sign-in page."}</p></div>`;
    return;
  }
  requestList.innerHTML = users.map((user) => `<article class="request-card" data-account="${escapeHtml(user.accountId)}"><div class="request-identity"><span class="request-avatar">${escapeHtml(user.initials)}</span><div><div class="request-name"><strong>${escapeHtml(user.displayName)}</strong><span class="pending-badge">Pending</span></div><span class="account-id">${escapeHtml(user.accountId)}</span></div></div><div class="request-details"><div><span>Requested role</span><strong>${escapeHtml(user.role)}</strong></div><div><span>Department</span><strong>${escapeHtml(user.department)}</strong></div><div><span>Submitted</span><strong>${escapeHtml(formatDate(user.createdAt))}</strong></div></div><div class="request-actions"><button class="action-button action-button--reject" type="button" data-decision="reject" data-account-id="${escapeHtml(user.accountId)}">${requestedAccount ? "Cancel request" : "Reject"}</button><button class="action-button action-button--approve" type="button" data-decision="approve" data-account-id="${escapeHtml(user.accountId)}">${shieldIcon}${requestedAccount ? "Authenticate and continue" : "Approve for sign-in"}</button></div></article>`).join("");
  document.querySelectorAll("[data-decision]").forEach((button) => button.addEventListener("click", () => decideAccount(button.dataset.accountId, button.dataset.decision)));
}

async function loadRequests() {
  refreshButton.disabled = true;
  try {
    const endpoint = requestedAccount ? `/api/prototype/users/pending?accountId=${encodeURIComponent(requestedAccount)}` : "/api/prototype/users/pending";
    const response = await fetch(endpoint, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Verification requests could not be loaded.");
    renderRequests(payload.pendingUsers);
  } catch (error) {
    requestList.innerHTML = `<div class="error-state">${alertIcon}<strong>Prototype verifier unavailable</strong><p>${escapeHtml(error.message || "Restart the application using run-app.bat.")}</p></div>`;
  } finally {
    refreshButton.disabled = false;
  }
}

async function decideAccount(accountId, decision) {
  if (decision === "reject" && !window.confirm(`Reject the account request for ${accountId}?`)) return;
  const card = document.querySelector(`[data-account="${CSS.escape(accountId)}"]`);
  card?.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  try {
    const response = await fetch("/api/prototype/users/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, decision }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "The verification decision could not be saved.");
    showToast(decision === "approve" ? "Prototype authentication complete" : "Request cancelled", decision === "approve" ? `${accountId} can now sign in to DLCTS.` : `${accountId} was not activated.`);
    if (requestedAccount) {
      const resultKey = decision === "approve" ? "verified" : "rejected";
      window.setTimeout(() => window.location.assign(`/?${resultKey}=${encodeURIComponent(accountId)}`), 900);
      return;
    }
    await loadRequests();
  } catch (error) {
    showToast("Decision not saved", error.message || "Try the action again.");
    card?.querySelectorAll("button").forEach((button) => { button.disabled = false; });
  }
}

refreshButton.addEventListener("click", loadRequests);
if (requestedAccount) {
  document.querySelector("#request-panel-title").textContent = `Authenticate ${requestedAccount}`;
}
loadRequests();
