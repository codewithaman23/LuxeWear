const authAlert = document.querySelector("[data-auth-alert]");
const showAuthMessage = (message, success = false) => {
  if (!authAlert) return;
  authAlert.textContent = message;
  authAlert.className = `auth-alert is-visible ${success ? "is-success" : "is-error"}`;
};
const api = async (url, options) => {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error || "Something went wrong. Please try again.");
  return body;
};
const redirectAfterAuth = () => {
  const target = new URLSearchParams(location.search).get("returnTo");
  location.href = target && target.startsWith("/") ? target : "index.html";
};
document.querySelector("[data-register-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  try { await api("/api/auth/register", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); redirectAfterAuth(); }
  catch (error) { showAuthMessage(error.message); button.disabled = false; }
});
const passwordForm = document.querySelector('[data-auth-form="password"]');
passwordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = passwordForm.querySelector("button");
  button.disabled = true;
  try { await api("/api/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(passwordForm))) }); redirectAfterAuth(); }
  catch (error) { showAuthMessage(error.message); button.disabled = false; }
});
const otpForm = document.querySelector('[data-auth-form="otp"]');
let otpEmail = "";
otpForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = new FormData(otpForm).get("email");
  const sendButton = otpForm.querySelector("[data-otp-send]");
  sendButton.disabled = true;
  try {
    await api("/api/auth/otp/request", { method: "POST", body: JSON.stringify({ email }) });
    otpEmail = email;
    otpForm.querySelector("[data-otp-field]").hidden = false;
    otpForm.querySelector("[data-otp-verify]").hidden = false;
    sendButton.textContent = "Code sent";
    showAuthMessage("Check your email for a 6-digit verification code.", true);
  } catch (error) { showAuthMessage(error.message); sendButton.disabled = false; }
});
otpForm?.querySelector("[data-otp-verify]")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try { await api("/api/auth/otp/verify", { method: "POST", body: JSON.stringify({ email: otpEmail, code: otpForm.querySelector("[name=code]").value }) }); redirectAfterAuth(); }
  catch (error) { showAuthMessage(error.message); button.disabled = false; }
});
document.querySelectorAll("[data-auth-tab]").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll("[data-auth-tab]").forEach((item) => item.classList.toggle("is-active", item === tab));
  document.querySelectorAll("[data-auth-form]").forEach((form) => { form.hidden = form.dataset.authForm !== tab.dataset.authTab; });
  authAlert?.classList.remove("is-visible");
}));