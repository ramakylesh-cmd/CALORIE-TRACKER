/* ── NutriPulse v2 — script.js ──────────────────────────────────────────── */
"use strict";

// ── STATE ─────────────────────────────────────────────────────────────────────
let addInProgress   = false;
let barcodeScanning = false;
let pendingBarcodeFood = null;
let micRecognition  = null;
let allFoods        = [];
let currentMode     = "standard";
let smartParseTimer = null;
let currentGoals    = { calories: 2000, protein: 150, carbs: 300, fats: 65 };
let currentWater    = { consumed_ml: 0, goal_ml: 2500 };
let pendingPhotoResult = null;

const RING_CIRC = 502.65;

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const foodInput    = document.getElementById("food-input");
const qtyInput     = document.getElementById("qty-input");
const addBtn       = document.getElementById("add-btn");
const addBtnText   = document.getElementById("add-btn-text");
const addBtnLoader = document.getElementById("add-btn-loader");
const formFeedback = document.getElementById("form-feedback");
const logTbody     = document.getElementById("log-tbody");
const emptyRow     = document.getElementById("empty-row");
const totalCalEl   = document.getElementById("total-cal");
const entryCountEl = document.getElementById("entry-count");
const calRingEl    = document.getElementById("calorie-ring");
const valProtein   = document.getElementById("val-protein");
const valCarbs     = document.getElementById("val-carbs");
const valFats      = document.getElementById("val-fats");
const barProtein   = document.getElementById("bar-protein");
const barCarbs     = document.getElementById("bar-carbs");
const barFats      = document.getElementById("bar-fats");
const acList       = document.getElementById("autocomplete-list");
const dateDisplay  = document.getElementById("date-display");
const clearLogBtn  = document.getElementById("clear-log-btn");
const insightList  = document.getElementById("insight-list");
const ringPct      = document.getElementById("ring-pct");
const hudFoodsVal  = document.getElementById("hud-foods-val");
const hudRemain    = document.getElementById("hud-remain");
const hudWater     = document.getElementById("hud-water");
const hudGoal      = document.getElementById("hud-goal");
const goalDisplay  = document.getElementById("goal-display");
const logFooter    = document.getElementById("log-footer");
const footerCal    = document.getElementById("footer-cal");
const footerP      = document.getElementById("footer-p");
const footerC      = document.getElementById("footer-c");
const footerF      = document.getElementById("footer-f");

// barcode modal
const barcodeModal  = document.getElementById("barcode-modal");
const barcodeBtn    = document.getElementById("barcode-btn");
const closeBarcodeBtn = document.getElementById("close-barcode");
const barcodeStatus = document.getElementById("barcode-status");
const barcodeResult = document.getElementById("barcode-result");
const barcodeConfirm= document.getElementById("barcode-confirm");

// mic modal
const micModal      = document.getElementById("mic-modal");
const micBtn        = document.getElementById("mic-btn");
const closeMicBtn   = document.getElementById("close-mic");
const micTranscript = document.getElementById("mic-transcript");
const micActions    = document.getElementById("mic-actions");
const micUseBtn     = document.getElementById("mic-use-btn");
const micRetryBtn   = document.getElementById("mic-retry-btn");

const toastContainer= document.getElementById("toast-container");

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setDateDisplay();
  initParticles();
  loadInitialData();
  bindEvents();
  bindModeToggle();
  bindLeftTabs();
  bindProfileForm();
  bindWater();
  bindPhotoScan();
  initPWA();
});

// ── DATE ──────────────────────────────────────────────────────────────────────
function setDateDisplay() {
  dateDisplay.textContent = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric"
  }).toUpperCase();
}

// ── PARTICLES ─────────────────────────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, particles;

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }

  function createParticles() {
    particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.8 + 0.3,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
      a: Math.random() * .5 + .1,
      hue: Math.random() > .7 ? "155,111,255" : "200,255,62"
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.hue},${p.a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  resize(); createParticles(); draw();
  window.addEventListener("resize", () => { resize(); createParticles(); });
}

// ── LOAD INITIAL DATA ─────────────────────────────────────────────────────────
async function loadInitialData() {
  try {
    const res = await fetch("/get_totals");
    const data = await res.json();
    allFoods = [];
    currentGoals = data.goals || { calories: 2000, protein: 150, carbs: 300, fats: 65 };
    currentWater = data.water || { consumed_ml: 0, goal_ml: 2500 };

    updateGoalDisplay();
    rebuildTable(data.entries || []);
    recalcDashboard(data.entries || []);
    updateInsights(data.insights || []);
    updateWaterUI(currentWater);

    // Load profile — localStorage first, then server
    const localProfile = localStorage.getItem("nutripulse_profile");
    if (localProfile) {
      try {
        const lp = JSON.parse(localProfile);
        applyProfileToForm(lp);
        // Push it to server so goals are correct
        fetch("/update_profile", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lp)
        }).then(r => r.json()).then(d => {
          if (d.status === "ok") { currentGoals = d.goals; updateGoalDisplay(); updateProfileGoalDisplay(d.goals); }
        }).catch(() => {});
      } catch(e) {}
    } else if (data.profile) {
      applyProfileToForm(data.profile);
    }
    if (data.goals) updateProfileGoalDisplay(data.goals);

    // Load food list
    const fRes = await fetch("/search_foods?q=");
    const fData = await fRes.json();
    allFoods = fData.results || [];
    document.getElementById("db-count").textContent = allFoods.length;
    renderDbTags(allFoods);
  } catch (e) {
    showFeedback("Could not connect to server.", "error");
  }
}

// ── LEFT PANEL TABS ───────────────────────────────────────────────────────────
function bindLeftTabs() {
  document.querySelectorAll(".left-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".left-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const pane = document.getElementById("ltab-" + btn.dataset.ltab);
      if (pane) pane.classList.add("active");
    });
  });
}

// ── DB TAGS ───────────────────────────────────────────────────────────────────
function renderDbTags(foods) {
  const tagList = document.getElementById("db-tag-list");
  tagList.innerHTML = "";
  foods.slice(0, 40).forEach(f => {
    const tag = document.createElement("span");
    tag.className = "db-tag";
    tag.textContent = f;
    tag.addEventListener("click", () => {
      if (currentMode === "standard") {
        foodInput.value = f; qtyInput.focus();
        switchToLogTab();
      } else {
        document.getElementById("smart-input").value = f + " 100";
        triggerSmartPreview(f + " 100");
        switchToLogTab();
      }
    });
    tagList.appendChild(tag);
  });
}

function switchToLogTab() {
  document.querySelector("[data-ltab='log']").click();
}

// DB search filter
document.getElementById("db-search").addEventListener("input", function() {
  const q = this.value.trim().toLowerCase();
  const filtered = q ? allFoods.filter(f => f.includes(q)) : allFoods;
  renderDbTags(filtered);
});

// ── MODE TOGGLE ───────────────────────────────────────────────────────────────
function bindModeToggle() {
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
      if (currentMode === "smart") {
        document.getElementById("standard-mode").classList.add("hidden");
        document.getElementById("smart-mode").classList.remove("hidden");
        document.getElementById("smart-input").focus();
      } else {
        document.getElementById("standard-mode").classList.remove("hidden");
        document.getElementById("smart-mode").classList.add("hidden");
        foodInput.focus();
      }
    });
  });

  const smartInput = document.getElementById("smart-input");
  const smartHint  = document.getElementById("smart-hint");

  smartInput.addEventListener("input", () => {
    clearTimeout(smartParseTimer);
    const val = smartInput.value.trim();
    if (!val) { smartHint.textContent = ""; smartHint.classList.add("hidden"); smartHint.classList.remove("visible"); return; }
    smartParseTimer = setTimeout(() => triggerSmartPreview(val), 400);
  });

  smartInput.addEventListener("keydown", e => { if (e.key === "Enter") handleAddFood(); });
}

async function triggerSmartPreview(val) {
  const smartHint = document.getElementById("smart-hint");
  try {
    const res = await fetch("/parse_input", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: val })
    });
    const data = await res.json();
    if (data.matched_food) {
      const qty = data.parsed_qty ? `${Math.round(data.parsed_qty)}g` : "100g";
      smartHint.textContent = `→ ${data.matched_food} · ${qty} (${Math.round(data.confidence * 100)}% match)`;
      smartHint.classList.remove("hidden");
      smartHint.classList.add("visible");
    } else {
      smartHint.textContent = "No match found — try rephrasing";
      smartHint.classList.remove("hidden");
      smartHint.classList.add("visible");
    }
  } catch (e) { smartHint.classList.add("hidden"); smartHint.classList.remove("visible"); }
}

// ── BIND EVENTS ───────────────────────────────────────────────────────────────
function bindEvents() {
  addBtn.addEventListener("click", handleAddFood);
  foodInput.addEventListener("keydown", e => { if (e.key === "Enter") qtyInput.focus(); });
  qtyInput.addEventListener("keydown", e => { if (e.key === "Enter") handleAddFood(); });
  foodInput.addEventListener("input", handleAutocomplete);
  foodInput.addEventListener("blur", () => setTimeout(() => acList.classList.add("hidden"), 160));
  foodInput.addEventListener("keydown", handleAcKeyboard);
  clearLogBtn.addEventListener("click", handleClearLog);
  barcodeBtn.addEventListener("click", openBarcodeModal);
  closeBarcodeBtn.addEventListener("click", closeBarcodeModal);
  barcodeModal.querySelector(".modal-backdrop").addEventListener("click", closeBarcodeModal);
  barcodeConfirm.addEventListener("click", confirmBarcodeFood);
  micBtn.addEventListener("click", openMicModal);
  closeMicBtn.addEventListener("click", closeMicModal);
  micModal.querySelector(".modal-backdrop").addEventListener("click", closeMicModal);
  micUseBtn.addEventListener("click", useMicTranscript);
  micRetryBtn.addEventListener("click", startSpeechRecognition);
}

// ── ADD FOOD ──────────────────────────────────────────────────────────────────
async function handleAddFood() {
  if (addInProgress) return;
  let foodName, qty;

  if (currentMode === "smart") {
    const val = document.getElementById("smart-input").value.trim();
    if (!val) { showFeedback("Please type something.", "error"); return; }
    foodName = val; qty = null;
  } else {
    foodName = foodInput.value.trim();
    const qtyRaw = qtyInput.value.trim();
    if (!foodName) { showFeedback("Please enter a food name.", "error"); foodInput.focus(); return; }
    if (!qtyRaw)   { showFeedback("Please enter a quantity.", "error"); qtyInput.focus(); return; }
    const qtyNum = parseFloat(qtyRaw);
    if (isNaN(qtyNum) || qtyNum <= 0) { showFeedback("Quantity must be a positive number.", "error"); return; }
    if (qtyNum > 5000) { showFeedback("Quantity seems unrealistic (max 5000g).", "error"); return; }
    qty = qtyNum;
  }

  addInProgress = true;
  addBtn.disabled = true;
  addBtnText.textContent = "Adding…";
  addBtnLoader.classList.remove("hidden");

  try {
    const body = { food_name: foodName };
    if (qty !== null) body.quantity = qty;

    const res = await fetch("/add_food", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (data.status === "ok") {
      const entry = data.entry;
      if (data.goals) { currentGoals = data.goals; updateGoalDisplay(); }

      if (data.matched && data.matched_as) {
        showFeedback(`✦ Matched "${data.matched_as}" — Added ${Math.round(entry.quantity_g)}g`, "matched");
      } else {
        showFeedback(`✓ Added ${entry.food_name} · ${Math.round(entry.quantity_g)}g · ${entry.calories} kcal`, "success");
      }

      if (currentMode === "smart") {
        document.getElementById("smart-input").value = "";
        document.getElementById("smart-hint").classList.add("hidden");
        document.getElementById("smart-hint").classList.remove("visible");
      } else {
        foodInput.value = ""; qtyInput.value = ""; foodInput.focus();
      }

      appendRow(entry);
      addCalToRing(entry.calories);
      updateMacros(entry);
      updateInsights(data.insights || []);
      updateHUD();
      showToast(`${entry.food_name} — ${entry.calories} kcal`, "success");

    } else if (data.status === "not_found") {
      let msg = data.message || "Food not found.";
      if (data.suggestions && data.suggestions.length) {
        msg += ` Try: ${data.suggestions.slice(0, 3).join(", ")}`;
      }
      showFeedback(msg, "error");
    } else {
      showFeedback(data.message || "Unknown error.", "error");
    }
  } catch (e) {
    showFeedback("Network error — is the server running?", "error");
  } finally {
    addInProgress = false;
    addBtn.disabled = false;
    addBtnText.textContent = "Add Food";
    addBtnLoader.classList.add("hidden");
  }
}

// ── AUTOCOMPLETE ──────────────────────────────────────────────────────────────
let acActiveIndex = -1;

async function handleAutocomplete() {
  const q = foodInput.value.trim().toLowerCase();
  acActiveIndex = -1;
  if (!q) { acList.classList.add("hidden"); return; }
  const matches = allFoods.filter(f => f.includes(q)).slice(0, 8);
  if (!matches.length) { acList.classList.add("hidden"); return; }
  acList.innerHTML = "";
  matches.forEach((m, i) => {
    const li = document.createElement("li");
    li.textContent = m; li.dataset.index = i;
    li.addEventListener("mousedown", () => { foodInput.value = m; acList.classList.add("hidden"); qtyInput.focus(); });
    acList.appendChild(li);
  });
  acList.classList.remove("hidden");
}

function handleAcKeyboard(e) {
  const items = acList.querySelectorAll("li");
  if (!items.length || acList.classList.contains("hidden")) return;
  if (e.key === "ArrowDown") { e.preventDefault(); acActiveIndex = Math.min(acActiveIndex + 1, items.length - 1); updateAcActive(items); }
  else if (e.key === "ArrowUp") { e.preventDefault(); acActiveIndex = Math.max(acActiveIndex - 1, -1); updateAcActive(items); }
  else if (e.key === "Enter" && acActiveIndex >= 0) { e.preventDefault(); foodInput.value = items[acActiveIndex].textContent; acList.classList.add("hidden"); qtyInput.focus(); }
  else if (e.key === "Escape") { acList.classList.add("hidden"); }
}

function updateAcActive(items) {
  items.forEach((li, i) => li.classList.toggle("active", i === acActiveIndex));
  if (acActiveIndex >= 0) items[acActiveIndex].scrollIntoView({ block: "nearest" });
}

// ── TABLE ─────────────────────────────────────────────────────────────────────
function rebuildTable(entries) {
  Array.from(logTbody.querySelectorAll("tr:not(#empty-row)")).forEach(r => r.remove());
  entries.forEach(e => appendRow(e, false));
  toggleEmptyState(entries.length === 0);
  updateEntryCount(entries.length);
  updateFooter(entries);
}

function appendRow(entry, animate = true) {
  toggleEmptyState(false);
  const tr = document.createElement("tr");
  if (!animate) tr.style.animation = "none";
  tr.dataset.id = entry.id;
  tr.innerHTML = `
    <td>${entry.food_name}</td>
    <td class="td-qty">${Math.round(entry.quantity_g)}g</td>
    <td class="td-kcal">${entry.calories}</td>
    <td class="td-p">${entry.protein}g</td>
    <td class="td-c">${entry.carbs}g</td>
    <td class="td-f">${entry.fats}g</td>
    <td><button class="del-btn" title="Remove">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button></td>`;
  tr.querySelector(".del-btn").addEventListener("click", () => handleDeleteEntry(entry.id, tr));
  logTbody.appendChild(tr);
  updateEntryCount(logTbody.querySelectorAll("tr:not(#empty-row)").length);
}

async function handleDeleteEntry(id, tr) {
  try {
    const res = await fetch("/delete_entry", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.status === "ok") {
      tr.style.transition = "opacity .2s, transform .2s";
      tr.style.opacity = "0"; tr.style.transform = "translateX(16px)";
      setTimeout(async () => {
        tr.remove();
        const remaining = logTbody.querySelectorAll("tr:not(#empty-row)").length;
        updateEntryCount(remaining);
        if (remaining === 0) toggleEmptyState(true);
        if (data.goals) { currentGoals = data.goals; updateGoalDisplay(); }
        const syncRes = await fetch("/get_totals");
        const syncData = await syncRes.json();
        recalcDashboard(syncData.entries || []);
        updateInsights(syncData.insights || []);
        updateFooter(syncData.entries || []);
        updateHUD();
      }, 220);
    }
  } catch (e) { /* ignore */ }
}

function toggleEmptyState(show) {
  emptyRow.style.display = show ? "" : "none";
  logFooter.style.display = show ? "none" : "";
}

function updateEntryCount(n) {
  entryCountEl.textContent = n;
  hudFoodsVal.textContent = n;
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function recalcDashboard(entries) {
  const totals = entries.reduce((acc, e) => ({
    calories: acc.calories + (e.calories || 0),
    protein:  acc.protein  + (e.protein  || 0),
    carbs:    acc.carbs    + (e.carbs    || 0),
    fats:     acc.fats     + (e.fats     || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  updateCalRing(totals.calories);
  setMacroDisplay(totals.protein, totals.carbs, totals.fats);
}

function addCalToRing(addedCal) {
  const current = parseInt(totalCalEl.textContent) || 0;
  updateCalRing(current + addedCal);
}

function updateMacros(entry) {
  const pv = parseFloat(valProtein.textContent) || 0;
  const cv = parseFloat(valCarbs.textContent) || 0;
  const fv = parseFloat(valFats.textContent) || 0;
  setMacroDisplay(pv + entry.protein, cv + entry.carbs, fv + entry.fats);
}

function setMacroDisplay(p, c, f) {
  valProtein.textContent = p.toFixed(1) + "g";
  valCarbs.textContent   = c.toFixed(1) + "g";
  valFats.textContent    = f.toFixed(1) + "g";
  barProtein.style.width = Math.min(100, (p / (currentGoals.protein || 150)) * 100) + "%";
  barCarbs.style.width   = Math.min(100, (c / (currentGoals.carbs   || 300)) * 100) + "%";
  barFats.style.width    = Math.min(100, (f / (currentGoals.fats    || 65))  * 100) + "%";
}

function updateCalRing(cal) {
  const rounded = Math.round(cal);
  totalCalEl.textContent = rounded;
  const goal = currentGoals.calories || 2000;
  const pct = Math.min(1, rounded / goal);
  calRingEl.style.strokeDashoffset = RING_CIRC - pct * RING_CIRC;
  if (pct >= 1) {
    calRingEl.style.stroke = "var(--danger)";
    calRingEl.style.filter = "drop-shadow(0 0 10px rgba(255,61,106,.7))";
  } else if (pct >= 0.85) {
    calRingEl.style.stroke = "var(--carbs)";
    calRingEl.style.filter = "drop-shadow(0 0 8px rgba(255,204,68,.5))";
  } else {
    calRingEl.style.stroke = "url(#ring-gradient)";
    calRingEl.style.filter = "drop-shadow(0 0 8px rgba(200,255,62,.5))";
  }
  ringPct.textContent = Math.round(pct * 100) + "%";
  updateHUD();
}

function updateHUD() {
  const cal = parseInt(totalCalEl.textContent) || 0;
  const goal = currentGoals.calories || 2000;
  const remaining = Math.max(0, goal - cal);
  hudRemain.textContent = remaining;
  hudRemain.style.color = remaining < 200 ? "var(--danger)" : remaining < 400 ? "var(--carbs)" : "var(--text)";
}

function updateGoalDisplay() {
  const g = currentGoals;
  goalDisplay.textContent = g.calories || 2000;
  hudGoal.textContent = g.calories || 2000;
  document.getElementById("goal-protein").textContent = g.protein || 150;
  document.getElementById("goal-carbs").textContent   = g.carbs   || 300;
  document.getElementById("goal-fats").textContent    = g.fats    || 65;
}

// ── AI INSIGHTS ───────────────────────────────────────────────────────────────
function updateInsights(insights) {
  if (!insights || insights.length === 0) {
    insightList.innerHTML = '<div class="insight-empty">Log foods to unlock AI insights ✨</div>';
    return;
  }
  insightList.innerHTML = "";
  insights.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = `insight-item ${item.type || "info"}`;
    div.style.animationDelay = `${i * 0.08}s`;
    div.innerHTML = `<span class="insight-icon">${item.icon || "•"}</span><span class="insight-msg">${item.msg}</span>`;
    insightList.appendChild(div);
  });
}

// Show AI typing indicator while AI thinks
function showAiTyping() {
  insightList.innerHTML = `<div class="ai-typing"><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div></div>`;
}

// ── LOG FOOTER ────────────────────────────────────────────────────────────────
function updateFooter(entries) {
  if (!entries || entries.length === 0) { logFooter.style.display = "none"; return; }
  logFooter.style.display = "";
  const t = entries.reduce((a, e) => ({
    cal: a.cal + (e.calories||0), p: a.p + (e.protein||0),
    c: a.c + (e.carbs||0), f: a.f + (e.fats||0)
  }), { cal:0, p:0, c:0, f:0 });
  footerCal.textContent = Math.round(t.cal);
  footerP.textContent = t.p.toFixed(1) + "g";
  footerC.textContent = t.c.toFixed(1) + "g";
  footerF.textContent = t.f.toFixed(1) + "g";
}

// ── CLEAR LOG ─────────────────────────────────────────────────────────────────
async function handleClearLog() {
  if (!confirm("Clear all logged entries for today?")) return;
  try {
    await fetch("/clear_log", { method: "POST" });
    Array.from(logTbody.querySelectorAll("tr:not(#empty-row)")).forEach(r => r.remove());
    toggleEmptyState(true);
    updateEntryCount(0);
    updateCalRing(0);
    setMacroDisplay(0, 0, 0);
    updateInsights([]);
    updateFooter([]);
    showToast("Log cleared.", "info");
  } catch (e) { showFeedback("Failed to clear log.", "error"); }
}

// ── PROFILE FORM ──────────────────────────────────────────────────────────────
function bindProfileForm() {
  document.getElementById("save-profile-btn").addEventListener("click", saveProfile);
  // Load from localStorage first (instant, survives server restarts)
  const saved = localStorage.getItem("nutripulse_profile");
  if (saved) {
    try { applyProfileToForm(JSON.parse(saved)); } catch(e) {}
  }
}

async function saveProfile() {
  const profile = {
    gender: document.getElementById("p-gender").value,
    age: parseInt(document.getElementById("p-age").value) || 25,
    height_cm: parseFloat(document.getElementById("p-height").value) || 175,
    weight_kg: parseFloat(document.getElementById("p-weight").value) || 70,
    activity: document.getElementById("p-activity").value,
    goal: document.getElementById("p-goal").value,
  };

  // Save to localStorage immediately — survives server restarts & cross-device not needed
  localStorage.setItem("nutripulse_profile", JSON.stringify(profile));

  try {
    const res = await fetch("/update_profile", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    const data = await res.json();
    if (data.status === "ok") {
      currentGoals = data.goals;
      updateGoalDisplay();
      updateProfileGoalDisplay(data.goals);
      showToast("Profile saved! Goals recalculated ⚡", "success");
      const syncRes = await fetch("/get_totals");
      const syncData = await syncRes.json();
      recalcDashboard(syncData.entries || []);
      updateInsights(syncData.insights || []);
    }
  } catch (e) { showToast("Saved locally. Server sync failed.", "error"); }
}

function applyProfileToForm(profile) {
  if (profile.gender) document.getElementById("p-gender").value = profile.gender;
  if (profile.age) document.getElementById("p-age").value = profile.age;
  if (profile.height_cm) document.getElementById("p-height").value = profile.height_cm;
  if (profile.weight_kg) document.getElementById("p-weight").value = profile.weight_kg;
  if (profile.activity) document.getElementById("p-activity").value = profile.activity;
  if (profile.goal) document.getElementById("p-goal").value = profile.goal;
}

function updateProfileGoalDisplay(goals) {
  document.getElementById("pg-bmr").textContent = goals.bmr ? goals.bmr + " kcal" : "—";
  document.getElementById("pg-tdee").textContent = goals.tdee ? goals.tdee + " kcal" : "—";
  document.getElementById("pg-cal").textContent = goals.calories ? goals.calories + " kcal" : "—";
  document.getElementById("pg-protein").textContent = goals.protein ? goals.protein + "g" : "—";
  document.getElementById("pg-carbs").textContent = goals.carbs ? goals.carbs + "g" : "—";
  document.getElementById("pg-fats").textContent = goals.fats ? goals.fats + "g" : "—";
}

// ── WATER TRACKER ─────────────────────────────────────────────────────────────
function bindWater() {
  document.querySelectorAll(".water-btn[data-ml]").forEach(btn => {
    btn.addEventListener("click", () => addWater(parseInt(btn.dataset.ml)));
  });
  document.getElementById("water-reset-btn").addEventListener("click", resetWater);
}

async function addWater(ml) {
  try {
    const res = await fetch("/add_water", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ml })
    });
    const data = await res.json();
    if (data.status === "ok") {
      currentWater = data.water;
      updateWaterUI(data.water);
      showToast(`+${ml}ml 💧 Hydration on point!`, "water");
    }
  } catch (e) { showToast("Failed to log water.", "error"); }
}

async function resetWater() {
  try {
    const res = await fetch("/reset_water", { method: "POST" });
    const data = await res.json();
    if (data.status === "ok") { currentWater = data.water; updateWaterUI(data.water); }
  } catch (e) { /* ignore */ }
}

function updateWaterUI(water) {
  const consumed = Math.round(water.consumed_ml);
  const goal = water.goal_ml || 2500;
  const pct = Math.min(100, (consumed / goal) * 100);
  document.getElementById("water-display").textContent = `${consumed} / ${goal}ml`;
  document.getElementById("water-fill").style.width = pct + "%";
  hudWater.textContent = consumed >= 1000 ? (consumed/1000).toFixed(1) + "L" : consumed + "ml";
  const goalText = document.getElementById("water-goal-text");
  if (pct >= 100) goalText.textContent = "🎉 Hydration goal crushed!";
  else if (pct >= 75) goalText.textContent = "💧 Almost there! Keep drinking.";
  else if (pct >= 50) goalText.textContent = "⚡ Halfway to your water goal!";
  else goalText.textContent = `${Math.round(goal - consumed)}ml remaining today`;
}

// ── PHOTO SCAN ────────────────────────────────────────────────────────────────
let currentPhotoBase64 = null;

function bindPhotoScan() {
  const dropArea    = document.getElementById("photo-drop-area");
  const cameraInput = document.getElementById("photo-input-camera");
  const galleryInput= document.getElementById("photo-input-gallery");
  const analyseBtn  = document.getElementById("analyse-btn");
  const photoAddBtn = document.getElementById("photo-add-btn");

  // ── Camera button — opens rear camera directly on mobile ─────────────
  document.getElementById("camera-capture-btn").addEventListener("click", () => {
    cameraInput.value = "";   // reset so same file can re-trigger
    cameraInput.click();
  });
  cameraInput.addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) loadPhoto(e.target.files[0]);
  });

  // ── Gallery button ────────────────────────────────────────────────────
  document.getElementById("gallery-upload-btn").addEventListener("click", () => {
    galleryInput.value = "";
    galleryInput.click();
  });
  galleryInput.addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) loadPhoto(e.target.files[0]);
  });

  // ── Drop area click → gallery (desktop) ──────────────────────────────
  dropArea.addEventListener("click", () => { galleryInput.value = ""; galleryInput.click(); });

  dropArea.addEventListener("dragover", e => { e.preventDefault(); dropArea.classList.add("dragover"); });
  dropArea.addEventListener("dragleave", () => dropArea.classList.remove("dragover"));
  dropArea.addEventListener("drop", e => {
    e.preventDefault(); dropArea.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) loadPhoto(file);
  });

  analyseBtn.addEventListener("click", analysePhoto);
  photoAddBtn.addEventListener("click", addPhotoResultToLog);
}

function loadPhoto(file) {
  // Guard: reject files over 10MB before reading (prevents OOM crash on mobile)
  if (file.size > 10 * 1024 * 1024) {
    showPhotoFeedback("Image too large (max 10MB). Please use a smaller photo.", "error");
    return;
  }

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(objectUrl);
    // Resize to max 800px to avoid memory crash on mobile
    const MAX = 800;
    let { width, height } = img;
    if (width > MAX || height > MAX) {
      const ratio = Math.min(MAX / width, MAX / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    currentPhotoBase64 = dataUrl.split(",")[1];

    const preview = document.getElementById("photo-preview");
    preview.src = dataUrl;
    preview.classList.add("visible");
    document.getElementById("photo-upload-icon").style.display = "none";
    document.getElementById("photo-drop-text").style.display = "none";
    document.getElementById("analyse-btn").disabled = false;
    document.getElementById("photo-result").classList.remove("visible");
    pendingPhotoResult = null;
  };
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    showPhotoFeedback("Could not load image. Try a different file.", "error");
  };
  img.src = objectUrl;
}

async function analysePhoto() {
  if (!currentPhotoBase64) return;
  const analyseBtn = document.getElementById("analyse-btn");
  const progressBar = document.getElementById("scan-progress");
  const progressFill = document.getElementById("scan-progress-fill");
  const feedback = document.getElementById("photo-feedback");

  analyseBtn.disabled = true;
  progressBar.classList.add("visible");
  feedback.classList.add("hidden");
  document.getElementById("photo-result").classList.remove("visible");

  // Animate progress bar
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 15, 85);
    progressFill.style.width = progress + "%";
  }, 200);

  try {
    const response = await fetch("/analyze_photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "data:image/jpeg;base64," + currentPhotoBase64 })
    });

    clearInterval(progressInterval);
    progressFill.style.width = "100%";

    if (!response.ok) {
      throw new Error("Server error: " + response.status);
    }

    const data = await response.json();

    setTimeout(() => { progressBar.classList.remove("visible"); progressFill.style.width = "0%"; }, 600);

    if (data.status === "ok") {
      const n = data.nutrition;
      pendingPhotoResult = { food_name: data.food_name, quantity_g: data.quantity_g };

      document.getElementById("photo-result-food").textContent =
        `${data.food_name} (~${data.quantity_g}g)`;
      document.getElementById("photo-result-macros").innerHTML = `
        <span class="m-cal">🔥 ${n.calories} kcal</span>
        <span class="m-p">P: ${n.protein}g</span>
        <span class="m-c">C: ${n.carbs}g</span>
        <span class="m-f">F: ${n.fats}g</span>`;
      document.getElementById("photo-result").classList.add("visible");
    } else {
      showPhotoFeedback(data.message || "AI could not identify the food. Try adding manually.", "error");
    }

  } catch (err) {
    clearInterval(progressInterval);
    progressBar.classList.remove("visible");
    progressFill.style.width = "0%";
    showPhotoFeedback("Photo analysis failed. Check your API key or add food manually.", "error");
    console.error("Photo analysis error:", err);
  } finally {
    analyseBtn.disabled = false;
  }
}

function showPhotoFeedback(msg, type) {
  const fb = document.getElementById("photo-feedback");
  fb.textContent = msg;
  fb.className = `feedback ${type}`;
  fb.classList.remove("hidden");
}

async function addPhotoResultToLog() {
  if (!pendingPhotoResult) return;
  const { food_name, quantity_g } = pendingPhotoResult;

  const body = { food_name, quantity: quantity_g };
  try {
    const res = await fetch("/add_food", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.status === "ok") {
      appendRow(data.entry);
      addCalToRing(data.entry.calories);
      updateMacros(data.entry);
      updateInsights(data.insights || []);
      if (data.goals) { currentGoals = data.goals; updateGoalDisplay(); }
      updateHUD();
      showToast(`📸 ${data.entry.food_name} added from photo!`, "success");
      document.getElementById("photo-result").classList.remove("visible");
      pendingPhotoResult = null;
      switchToLogTab();
    }
  } catch (e) { showToast("Failed to add food.", "error"); }
}

// ── FEEDBACK ──────────────────────────────────────────────────────────────────
let feedbackTimer = null;
function showFeedback(msg, type = "info") {
  formFeedback.textContent = msg;
  formFeedback.className = `feedback ${type}`;
  formFeedback.classList.remove("hidden");
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => formFeedback.classList.add("hidden"), 4200);
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.classList.add("fade-out");
    t.addEventListener("animationend", () => t.remove());
  }, 2800);
}

// ── BARCODE SCANNER ───────────────────────────────────────────────────────────
function openBarcodeModal() {
  pendingBarcodeFood = null;
  barcodeResult.classList.add("hidden");
  barcodeConfirm.classList.add("hidden");
  barcodeStatus.textContent = "Starting camera…";
  barcodeModal.classList.remove("hidden");
  startBarcodeScanner();
}

function closeBarcodeModal() { stopBarcodeScanner(); barcodeModal.classList.add("hidden"); }

function startBarcodeScanner() {
  if (barcodeScanning) return;
  const video = document.getElementById("scanner-video");
  if (typeof Quagga === "undefined") { barcodeStatus.textContent = "Scanner library not loaded."; return; }
  Quagga.init({
    inputStream: { name: "Live", type: "LiveStream", target: video, constraints: { facingMode: "environment", width: 640, height: 240 } },
    decoder: { readers: ["ean_reader","ean_8_reader","upc_reader","upc_e_reader","code_128_reader"] },
    locate: true, numOfWorkers: 2, frequency: 10,
  }, err => {
    if (err) { barcodeStatus.textContent = "Camera access denied or unavailable."; return; }
    Quagga.start(); barcodeScanning = true;
    barcodeStatus.textContent = "Point camera at a barcode";
  });

  let lastCode = null, lastTime = 0;
  Quagga.onDetected(async result => {
    const code = result.codeResult.code;
    const now = Date.now();
    if (code === lastCode && now - lastTime < 3000) return;
    lastCode = code; lastTime = now;
    barcodeStatus.textContent = `Detected: ${code} — Looking up…`;
    try {
      const res = await fetch("/scan_barcode", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: code })
      });
      const data = await res.json();
      if (data.status === "ok") {
        stopBarcodeScanner();
        pendingBarcodeFood = { food_name: data.food_name, quantity_g: data.quantity_g };
        barcodeResult.innerHTML = `
          <div class="br-name">${data.food_name}</div>
          <div class="br-macros">
            <span class="br-macro">🔥 ${data.preview.calories} kcal</span>
            <span class="br-macro" style="color:var(--protein)">P: ${data.preview.protein}g</span>
            <span class="br-macro" style="color:var(--carbs)">C: ${data.preview.carbs}g</span>
            <span class="br-macro" style="color:var(--fats)">F: ${data.preview.fats}g</span>
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:6px;font-family:var(--font-mono)">Qty: ${data.quantity_g}g</div>`;
        barcodeResult.classList.remove("hidden");
        barcodeConfirm.classList.remove("hidden");
        barcodeStatus.textContent = "✓ Match found!";
      } else {
        barcodeStatus.textContent = data.message;
        setTimeout(() => { closeBarcodeModal(); showFeedback(data.message + " — Enter manually.", "error"); foodInput.focus(); }, 1800);
      }
    } catch (e) { barcodeStatus.textContent = "Network error during lookup."; }
  });
}

function stopBarcodeScanner() {
  if (!barcodeScanning) return;
  try { Quagga.offDetected(); Quagga.stop(); } catch (e) {}
  barcodeScanning = false;
}

async function confirmBarcodeFood() {
  if (!pendingBarcodeFood) return;
  foodInput.value = pendingBarcodeFood.food_name;
  qtyInput.value = pendingBarcodeFood.quantity_g;
  if (currentMode !== "standard") document.querySelector("[data-mode='standard']").click();
  closeBarcodeModal();
  switchToLogTab();
  await handleAddFood();
}

// ── SPEECH / MIC ──────────────────────────────────────────────────────────────
function openMicModal() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showFeedback("Voice input not supported. Try Chrome.", "error"); return; }
  micTranscript.textContent = "Listening…";
  micActions.classList.add("hidden");
  micModal.classList.remove("hidden");
  startSpeechRecognition();
}

function closeMicModal() {
  if (micRecognition) { try { micRecognition.abort(); } catch(e){} }
  micModal.classList.add("hidden");
}

function startSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  micTranscript.textContent = "Listening…";
  micActions.classList.add("hidden");
  micRecognition = new SR();
  micRecognition.lang = "en-US"; micRecognition.interimResults = true; micRecognition.maxAlternatives = 1;
  micRecognition.onresult = event => {
    const transcript = Array.from(event.results).map(r => r[0].transcript).join("").trim();
    micTranscript.textContent = transcript || "…";
  };
  micRecognition.onend = () => {
    const text = micTranscript.textContent;
    if (text && text !== "Listening…" && text !== "…") micActions.classList.remove("hidden");
    else { micTranscript.textContent = "No speech detected. Try again."; micActions.classList.remove("hidden"); }
  };
  micRecognition.onerror = event => {
    micTranscript.textContent = event.error === "not-allowed" ? "Microphone permission denied." : `Error: ${event.error}`;
    micActions.classList.remove("hidden");
  };
  try { micRecognition.start(); } catch (e) { micTranscript.textContent = "Could not start microphone."; micActions.classList.remove("hidden"); }
}

function useMicTranscript() {
  const text = micTranscript.textContent.trim();
  if (!text || text === "Listening…" || text === "…" || text.startsWith("Error") || text.startsWith("Microphone")) {
    showFeedback("No valid input.", "error"); return;
  }
  closeMicModal();
  // Switch to smart mode and populate
  if (!document.querySelector("[data-mode='smart']").classList.contains("active")) {
    document.querySelector("[data-mode='smart']").click();
  }
  switchToLogTab();
  const si = document.getElementById("smart-input");
  si.value = text;
  triggerSmartPreview(text);
  showFeedback(`Voice: "${text}" — press Add Food to confirm.`, "info");
}

// ── PWA ───────────────────────────────────────────────────────────────────────
let deferredPrompt = null;

function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/sw.js').catch(() => {});
  }

  // Always show manual install button in header
  const manualBtn = document.getElementById("pwa-manual-btn");
  if (manualBtn) manualBtn.classList.remove("hidden");

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById("pwa-banner");
    if (banner) banner.classList.remove("hidden");
    if (manualBtn) manualBtn.classList.remove("hidden");
  });

  // Install via banner
  const installBtn = document.getElementById("pwa-install-btn");
  if (installBtn) {
    installBtn.addEventListener("click", triggerInstall);
  }
  // Install via header button
  if (manualBtn) {
    manualBtn.addEventListener("click", triggerInstall);
  }

  const dismissBtn = document.getElementById("pwa-dismiss-btn");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      document.getElementById("pwa-banner").classList.add("hidden");
    });
  }

  // If already installed as standalone — hide banner
  if (window.matchMedia('(display-mode: standalone)').matches) {
    const banner = document.getElementById("pwa-banner");
    if (banner) banner.classList.add("hidden");
    if (manualBtn) manualBtn.classList.add("hidden");
  }
}

async function triggerInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") showToast("App installed! 🚀", "success");
    deferredPrompt = null;
    const banner = document.getElementById("pwa-banner");
    if (banner) banner.classList.add("hidden");
  } else {
    // Fallback instructions for browsers that don't support beforeinstallprompt
    showToast("To install: tap Share → Add to Home Screen (iOS) or menu → Install App (Android/Chrome)", "info");
  }
}