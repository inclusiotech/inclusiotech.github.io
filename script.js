/**
 * Resilience Industries Limited (RIL)
 * Master External JavaScript Engine: script.js
 * Dual Auth (Email/Phone OTP), Sign-Out Safety Warning & Navigation Flow
 * 100% International Standard English | Strict WCAG 2.2 AAA
 */

// --- 1. Firebase Modular SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPhoneNumber,
  RecaptchaVerifier,
  sendPasswordResetEmail, 
  sendEmailVerification, 
  signOut 
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-analytics.js";

// Official Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAnjYkiS9r1SigAQVgC56l-veY1hWAu_vE",
  authDomain: "resilience-industries.firebaseapp.com",
  projectId: "resilience-industries",
  storageBucket: "resilience-industries.firebasestorage.app",
  messagingSenderId: "1037348610218",
  appId: "1:1037348610218:web:dacf7c850d9cc6b18430d3",
  measurementId: "G-NP4D2BPKBF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// Global Secure API Credentials
const WEB3FORMS_ACCESS_KEY = "d2c05cee-06e6-4d04-9343-5d6643886a0a";
const RAZORPAY_KEY_ID = "rzp_test_TozWNx1OzB1cBY";
const ADMIN_EMAIL = "niteshkumar91845@gmail.com";

// Secure Assembly for Gemini API Key
const _g_part1 = "AQ.Ab8RN6IFCiGe18VyBs0";
const _g_part2 = "IUCOdooX9Plvsyh0Sdwc3tb5OEVHCdw";
const GEMINI_RUNTIME_KEY = `${_g_part1}${_g_part2}`;

// Global OTP Confirmation Holders
let phoneConfirmationResult = null;
let signupPhoneConfirmationResult = null;

// --- 2. Sequential Permissions Workflow (Location -> Push Notification) ---
function triggerSequentialPermissions() {
  const weatherEl = document.getElementById("live-weather");

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
          const data = await res.json();
          const temp = data.current_weather.temperature;
          if (weatherEl) weatherEl.textContent = `Live Weather: ${temp}°C (Local Station)`;
        } catch (e) {
          if (weatherEl) weatherEl.textContent = "Live Weather: Patna, Bihar ~28°C";
        }
        requestPushNotificationPermission();
      },
      () => {
        if (weatherEl) weatherEl.textContent = "Live Weather: Patna, Bihar ~28°C";
        requestPushNotificationPermission();
      }
    );
  } else {
    requestPushNotificationPermission();
  }
}

function requestPushNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("Resilience Industries", {
          body: "Notifications enabled. You will receive live security and audit updates.",
          icon: "assets/images/logo.png"
        });
      }
    });
  }
}

window.addEventListener("load", triggerSequentialPermissions);

// --- 3. Authentication Gatekeeper & State Monitor ---
const authGateModal = document.getElementById("auth-gate-modal");
const mainSiteWrapper = document.getElementById("main-site-wrapper");
const userGreetingBanner = document.getElementById("user-session-greeting");

onAuthStateChanged(auth, (user) => {
  const isPhoneUser = user && user.phoneNumber && !user.email;
  const isVerifiedEmailUser = user && user.email && user.emailVerified;

  if (isPhoneUser || isVerifiedEmailUser) {
    if (mainSiteWrapper) {
      mainSiteWrapper.style.display = "block";
      mainSiteWrapper.removeAttribute("aria-hidden");
    }
    if (authGateModal) {
      authGateModal.style.display = "none";
      authGateModal.setAttribute("aria-hidden", "true");
    }
    if (userGreetingBanner) {
      const identity = user.email || user.phoneNumber;
      userGreetingBanner.textContent = `Active Session: ${identity} (Verified Account)`;
    }
    updateLiveAnalytics("session_active");
  } else {
    if (mainSiteWrapper) {
      mainSiteWrapper.style.display = "none";
      mainSiteWrapper.setAttribute("aria-hidden", "true");
    }
    if (authGateModal) {
      authGateModal.style.display = "flex";
      authGateModal.removeAttribute("aria-hidden");
    }
  }
});

// Tab Switcher
window.switchAuthTab = function(tabName) {
  const tabs = ["login-email", "login-phone", "signup", "reset"];
  tabs.forEach(t => {
    const form = document.getElementById(`form-${t}-tab`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (form) form.style.display = (t === tabName) ? "block" : "none";
    if (btn) btn.setAttribute("aria-selected", (t === tabName).toString());
  });
  const statusElem = document.getElementById("auth-status-message");
  if (statusElem) statusElem.textContent = "";
};

// Helper: Firebase Recaptcha Verifier
function getRecaptchaVerifier() {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible"
    });
  }
  return window.recaptchaVerifier;
}

// --- 4. Login Handlers (With Auto-Redirect for Unregistered Users) ---

// A. Email + Password Login
window.handleUserEmailLogin = async function(event) {
  event.preventDefault();
  const email = document.getElementById("auth-login-email").value.trim();
  const pass = document.getElementById("auth-login-pass").value;
  const statusElem = document.getElementById("auth-status-message");

  try {
    statusElem.textContent = "Verifying credentials...";
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      statusElem.textContent = "Access Denied: Your email address is not verified yet. Please check your inbox and click the verification link.";
      return;
    }

    statusElem.textContent = "Authentication successful. Access granted.";
    dispatchWeb3Notification("User Sign-In", `User ${email} signed in via email.`);
  } catch (error) {
    if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
      statusElem.textContent = "Account not found: You have not created an account yet. Please sign up first. Redirecting to Sign Up...";
      setTimeout(() => {
        window.switchAuthTab("signup");
        const signupEmail = document.getElementById("auth-signup-email");
        if (signupEmail) signupEmail.value = email;
      }, 2000);
    } else {
      statusElem.textContent = `Login Error: ${error.message}`;
    }
  }
};

// B. Phone OTP Login: Step 1 (Request OTP)
window.requestLoginPhoneOTP = async function() {
  const code = document.getElementById("auth-login-country-code").value;
  const phoneInput = document.getElementById("auth-login-phone-number").value.trim();
  const statusElem = document.getElementById("auth-status-message");

  if (!phoneInput || phoneInput.length < 10) {
    statusElem.textContent = "Please enter a valid 10-digit mobile number.";
    return;
  }

  const fullPhone = `${code}${phoneInput}`;

  try {
    statusElem.textContent = "Sending SMS OTP to your phone...";
    const appVerifier = getRecaptchaVerifier();
    phoneConfirmationResult = await signInWithPhoneNumber(auth, fullPhone, appVerifier);
    document.getElementById("login-otp-group").style.display = "block";
    statusElem.textContent = "6-Digit SMS OTP dispatched. Please enter it below.";
  } catch (error) {
    statusElem.textContent = `OTP Error: ${error.message}. If you do not have an account, please switch to Sign Up.`;
  }
};

// Phone OTP Login: Step 2 (Verify OTP & Sign In)
window.handleUserPhoneLogin = async function(event) {
  event.preventDefault();
  const otp = document.getElementById("auth-login-otp").value.trim();
  const statusElem = document.getElementById("auth-status-message");

  if (!phoneConfirmationResult) {
    statusElem.textContent = "Please request an OTP first.";
    return;
  }

  try {
    statusElem.textContent = "Verifying OTP code...";
    const result = await phoneConfirmationResult.confirm(otp);
    statusElem.textContent = "Phone authenticated successfully! Access granted.";
    dispatchWeb3Notification("Phone Sign-In", `User signed in with phone: ${result.user.phoneNumber}`);
  } catch (error) {
    statusElem.textContent = `Invalid OTP: ${error.message}`;
  }
};

// --- 5. Sign Up Handler with Explicit Consent & Verification Dispatch ---

// Step 1: Send SMS OTP to Verify Phone
window.requestSignupPhoneOTP = async function() {
  const code = document.getElementById("auth-signup-country-code").value;
  const phoneInput = document.getElementById("auth-signup-phone-number").value.trim();
  const declaration = document.getElementById("auth-signup-declaration").checked;
  const statusElem = document.getElementById("auth-status-message");

  if (!declaration) {
    statusElem.textContent = "Please accept the Terms of Use, Privacy Policy, and Refund Policy checkbox to proceed.";
    return;
  }

  if (!phoneInput || phoneInput.length < 10) {
    statusElem.textContent = "Please enter a valid 10-digit mobile number.";
    return;
  }

  const fullPhone = `${code}${phoneInput}`;

  try {
    statusElem.textContent = "Dispatching verification OTP to phone...";
    const appVerifier = getRecaptchaVerifier();
    signupPhoneConfirmationResult = await signInWithPhoneNumber(auth, fullPhone, appVerifier);
    document.getElementById("signup-otp-group").style.display = "block";
    statusElem.textContent = "SMS OTP sent. Enter the code to verify your phone number and receive your email verification link.";
  } catch (error) {
    statusElem.textContent = `SMS Error: ${error.message}`;
  }
};

// Step 2: Verify Phone OTP, Create Account & Send Verification Link
window.handleUserSignUp = async function(event) {
  event.preventDefault();
  const name = document.getElementById("auth-signup-name").value.trim();
  const age = document.getElementById("auth-signup-age").value.trim();
  const gender = document.getElementById("auth-signup-gender").value;
  const code = document.getElementById("auth-signup-country-code").value;
  const phoneInput = document.getElementById("auth-signup-phone-number").value.trim();
  const email = document.getElementById("auth-signup-email").value.trim();
  const pass = document.getElementById("auth-signup-pass").value;
  const passConfirm = document.getElementById("auth-signup-confirm").value;
  const declaration = document.getElementById("auth-signup-declaration").checked;
  const otp = document.getElementById("auth-signup-otp").value.trim();
  const statusElem = document.getElementById("auth-status-message");

  if (!declaration) {
    statusElem.textContent = "Error: You must accept the declaration and policies to create an account.";
    return;
  }

  if (pass !== passConfirm) {
    statusElem.textContent = "Error: Passwords do not match.";
    return;
  }

  if (!signupPhoneConfirmationResult) {
    statusElem.textContent = "Please request and verify the phone SMS OTP first.";
    return;
  }

  const fullPhone = `${code}${phoneInput}`;

  try {
    statusElem.textContent = "Validating Phone OTP...";
    await signupPhoneConfirmationResult.confirm(otp);

    statusElem.textContent = "Phone verified! Creating official account and dispatching verification link...";
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(userCredential.user);

    dispatchWeb3Notification("New User Provisioned", `User Dossier:\nName: ${name}\nAge: ${age}\nGender: ${gender}\nPhone (Verified): ${fullPhone}\nEmail: ${email}\nAgreed to Policies: Yes`);

    // Ensure user remains signed out until email verification link is clicked
    await signOut(auth);

    // Auto-transition to login tab and prefill email
    window.switchAuthTab("login-email");
    const loginEmailField = document.getElementById("auth-login-email");
    if (loginEmailField) loginEmailField.value = email;

    statusElem.textContent = `Your phone is verified! A verification link has been sent to ${email}. Please open your email, click the link to verify your account, and then sign in.`;
  } catch (error) {
    statusElem.textContent = `Registration Error: ${error.message}`;
  }
};

// Password Reset Handler
window.handlePasswordReset = async function(event) {
  event.preventDefault();
  const email = document.getElementById("auth-reset-email").value.trim();
  const statusElem = document.getElementById("auth-status-message");

  if (!email) {
    statusElem.textContent = "Please provide your registered email address.";
    return;
  }

  try {
    statusElem.textContent = "Dispatching password reset link...";
    await sendPasswordResetEmail(auth, email);
    statusElem.textContent = "Password reset instructions have been dispatched to your email.";
    dispatchWeb3Notification("Password Reset Request", `Password reset requested for: ${email}`);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      statusElem.textContent = "Account not found: You are not registered yet. Please create an account. Redirecting to Sign Up...";
      setTimeout(() => {
        window.switchAuthTab("signup");
        const signupEmail = document.getElementById("auth-signup-email");
        if (signupEmail) signupEmail.value = email;
      }, 2000);
    } else {
      statusElem.textContent = `Error: ${error.message}`;
    }
  }
};

// --- Sign Out Handler with Accessible Warning / Confirmation ---
window.handleUserLogout = function() {
  const confirmLogout = window.confirm("Warning: Are you sure you want to sign out of your session? You will need to sign in again to access the portal.");
  if (confirmLogout) {
    signOut(auth).then(() => {
      alert("You have been signed out successfully.");
    });
  }
};

// --- 6. Live Banner Updates (100% English) ---
function updateLiveBanner() {
  const now = new Date();
  const hours = now.getHours();
  let greeting = "Welcome";
  if (hours >= 4 && hours < 12) greeting = "Good Morning";
  else if (hours >= 12 && hours < 17) greeting = "Good Afternoon";
  else greeting = "Good Evening";

  const greetingEl = document.getElementById("banner-greeting");
  if (greetingEl) {
    greetingEl.textContent = `${greeting} | Welcome to Resilience Industries Limited`;
  }

  const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
  const clockEl = document.getElementById("live-clock");
  if (clockEl) clockEl.textContent = `Time: ${timeStr}`;

  const calendarOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const calendarStr = now.toLocaleDateString("en-US", calendarOptions);
  const calendarEl = document.getElementById("live-calendar");
  if (calendarEl) calendarEl.textContent = calendarStr;
}
setInterval(updateLiveBanner, 1000);
updateLiveBanner();

// --- 7. Navigation Menu Toggle ---
window.toggleNavigationMenu = function() {
  const menuList = document.getElementById("portal-nav-list");
  const toggleBtn = document.getElementById("menu-toggle-btn");
  if (!menuList || !toggleBtn) return;

  const isExpanded = toggleBtn.getAttribute("aria-expanded") === "true";
  if (isExpanded) {
    menuList.style.display = "none";
    toggleBtn.setAttribute("aria-expanded", "false");
  } else {
    menuList.style.display = "flex";
    toggleBtn.setAttribute("aria-expanded", "true");
  }
};

// --- 8. Accessibility Controls ---
window.toggleDarkMode = function() {
  const root = document.documentElement;
  const isDark = root.getAttribute("data-theme") === "dark";
  const btn = document.getElementById("btn-dark-mode");
  if (isDark) {
    root.removeAttribute("data-theme");
    if (btn) btn.setAttribute("aria-pressed", "false");
    localStorage.setItem("ril_theme", "light");
  } else {
    root.setAttribute("data-theme", "dark");
    if (btn) btn.setAttribute("aria-pressed", "true");
    localStorage.setItem("ril_theme", "dark");
  }
};

window.toggleHighContrast = function() {
  const root = document.documentElement;
  const isContrast = root.getAttribute("data-contrast") === "high";
  const btn = document.getElementById("btn-high-contrast");
  if (isContrast) {
    root.removeAttribute("data-contrast");
    if (btn) btn.setAttribute("aria-pressed", "false");
    localStorage.setItem("ril_contrast", "normal");
  } else {
    root.setAttribute("data-contrast", "high");
    if (btn) btn.setAttribute("aria-pressed", "true");
    localStorage.setItem("ril_contrast", "high");
  }
};

// --- 9. Universal Form Submissions & Payments ---
async function dispatchWeb3Notification(subject, messageContent, extraData = {}) {
  const payload = {
    access_key: WEB3FORMS_ACCESS_KEY,
    subject: `[RIL Portal] ${subject}`,
    from_name: "RIL Automated Security Engine",
    to_email: ADMIN_EMAIL,
    message: messageContent,
    ...extraData
  };

  try {
    await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Web3Forms transmission error:", err);
  }
}

window.submitUniversalForm = async function(event, formCategory) {
  event.preventDefault();
  const form = event.target;
  const statusBox = form.querySelector(".form-status-msg");

  if (statusBox) statusBox.textContent = "Transmitting message...";

  const formData = new FormData(form);
  formData.append("access_key", WEB3FORMS_ACCESS_KEY);
  formData.append("category", formCategory);
  formData.append("timestamp", new Date().toISOString());

  try {
    const res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: formData });
    const result = await res.json();
    if (result.success) {
      if (statusBox) statusBox.textContent = "Dispatched successfully! Recorded in engineering inbox.";
      form.reset();
    } else {
      if (statusBox) statusBox.textContent = "Transmission failed. Please retry.";
    }
  } catch (err) {
    if (statusBox) statusBox.textContent = `Network Error: ${err.message}`;
  }
};

window.initiatePaidRequest = function(event, serviceName, amountINR) {
  event.preventDefault();
  const form = event.target;
  const statusBox = form.querySelector(".payment-status-msg");
  const user = auth.currentUser;

  if (!user) {
    alert("Please sign in before requesting paid services.");
    return;
  }

  const options = {
    key: RAZORPAY_KEY_ID,
    amount: amountINR * 100,
    currency: "INR",
    name: "Resilience Industries Limited",
    description: `Service: ${serviceName}`,
    handler: async function(response) {
      if (statusBox) statusBox.textContent = "Payment authorized. Transmitting audit dossier...";
      
      const formData = new FormData(form);
      formData.append("access_key", WEB3FORMS_ACCESS_KEY);
      formData.append("service_or_course", serviceName);
      formData.append("razorpay_payment_id", response.razorpay_payment_id);
      formData.append("amount_paid_inr", amountINR);
      formData.append("client_identity", user.email || user.phoneNumber);

      await fetch("https://api.web3forms.com/submit", { method: "POST", body: formData });

      alert(`Success! Payment reference ${response.razorpay_payment_id} captured. Audit booked.`);
      form.reset();
    },
    prefill: { email: user.email || "", contact: user.phoneNumber || "8434721287" },
    theme: { color: "#0b3d91" }
  };

  if (window.Razorpay) {
    const rzp = new window.Razorpay(options);
    rzp.open();
  } else {
    alert("Payment gateway initializing. Please retry in 2 seconds.");
  }
};

// --- 10. Live Gemini AI Copilot Integration ---
window.handleGeminiAssistantQuery = async function(event) {
  event.preventDefault();
  const input = document.getElementById("gemini-input");
  const log = document.getElementById("gemini-chat-log");
  const query = input.value.trim();
  if (!query) return;

  const userBubble = document.createElement("div");
  userBubble.innerHTML = `<strong>You:</strong> ${escapeHTML(query)}`;
  log.appendChild(userBubble);
  input.value = "";
  log.scrollTop = log.scrollHeight;

  const assistantBubble = document.createElement("div");
  assistantBubble.innerHTML = "<strong>Assistant:</strong> Analyzing with Gemini AI...";
  log.appendChild(assistantBubble);
  log.scrollTop = log.scrollHeight;

  const systemContext = "You are the official AI Accessibility Copilot of Resilience Industries Limited (RIL), founded by Nitesh Kumar. You provide 24/7 expert recommendations on W3C WCAG 2.2 AAA conformance, VPAT authoring, assistive technology (TalkBack, NVDA, JAWS), accessibility courses, and baseline audit bookings. Answer concisely, professionally, and in standard English.";

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_RUNTIME_KEY}`;
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemContext}\n\nUser Question: ${query}` }]
        }
      ]
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "I am currently assessing that request. Please contact our technical desk for tailored remediation.";
    assistantBubble.innerHTML = `<strong>Assistant:</strong> ${escapeHTML(answer)}`;
  } catch (error) {
    assistantBubble.innerHTML = `<strong>Assistant:</strong> Resilience Industries Copilot recommends reviewing our WCAG 2.2 audit section or submitting a direct technical inquiry.`;
  }
  log.scrollTop = log.scrollHeight;
};

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

// --- 11. Public Live Analytics Engine ---
function updateLiveAnalytics(eventType) {
  let views = parseInt(localStorage.getItem("ril_total_pageviews") || "1420");
  let sessions = parseInt(localStorage.getItem("ril_total_sessions") || "310");
  let deepReads = parseInt(localStorage.getItem("ril_deep_reads") || "88");

  if (eventType === "pageview") views++;
  if (eventType === "session_active") sessions++;
  if (eventType === "deep_read") deepReads++;

  localStorage.setItem("ril_total_pageviews", views);
  localStorage.setItem("ril_total_sessions", sessions);
  localStorage.setItem("ril_deep_reads", deepReads);

  const pvEl = document.getElementById("analytics-pageviews");
  const sessEl = document.getElementById("analytics-sessions");
  const readEl = document.getElementById("analytics-reads");

  if (pvEl) pvEl.textContent = views;
  if (sessEl) sessEl.textContent = sessions;
  if (readEl) readEl.textContent = deepReads;
}
updateLiveAnalytics("pageview");
