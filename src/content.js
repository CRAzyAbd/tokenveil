// content.js — TokenVeil: native-feeling overlay for claude.ai

(() => {
  const PANEL_ID = "tokenveil-panel";
  const REFRESH_INTERVAL = 5000;

  let conversationTokens = 0;
  let isExpanded = false;
  let refreshTimer = null;

  // ─── Hook fetch to read conversation messages ────────────────────────────
  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await _fetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (url.includes("chat_conversations") && !url.includes("usage")) {
        res.clone().json().then(data => {
          const messages = data?.chat_messages ?? data?.messages ?? [];
          if (messages.length > 0) {
            conversationTokens = TokenCounter.countConversationTokens(messages);
            updateUI();
          }
        }).catch(() => {});
      }
    } catch (_) {}
    return res;
  };

  // ─── Build the widget DOM ────────────────────────────────────────────────
  function buildPanel() {
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "tv-panel tv-collapsed";
    panel.innerHTML = `
      <!-- Collapsed pill view -->
      <button class="tv-pill" id="tv-pill-btn" title="Click to expand">
        <span class="tv-pill-dot"></span>
        <span class="tv-pill-text" id="tv-pill-text">0%</span>
      </button>

      <!-- Expanded panel view -->
      <div class="tv-expanded" id="tv-expanded">
        <div class="tv-head">
          <span class="tv-model" id="tv-model">Claude</span>
          <button class="tv-close" id="tv-close-btn" title="Collapse">×</button>
        </div>

        <div class="tv-stat">
          <div class="tv-stat-row">
            <span class="tv-stat-label">Context</span>
            <span class="tv-stat-value" id="tv-ctx-value">0 / 200k</span>
          </div>
          <div class="tv-bar"><div class="tv-bar-fill" id="tv-ctx-bar"></div></div>
        </div>

        <div class="tv-stat">
          <div class="tv-stat-row">
            <span class="tv-stat-label">Session</span>
            <span class="tv-stat-value" id="tv-ses-value">—</span>
          </div>
          <div class="tv-bar"><div class="tv-bar-fill" id="tv-ses-bar"></div></div>
          <div class="tv-stat-sub" id="tv-ses-reset">resets in —</div>
        </div>

        <div class="tv-stat">
          <div class="tv-stat-row">
            <span class="tv-stat-label">Weekly</span>
            <span class="tv-stat-value" id="tv-wk-value">—</span>
          </div>
          <div class="tv-bar"><div class="tv-bar-fill" id="tv-wk-bar"></div></div>
          <div class="tv-stat-sub" id="tv-wk-reset">resets in —</div>
        </div>
      </div>
    `;
    return panel;
  }

  // ─── Update a single bar (width + warning color) ─────────────────────────
  function setBar(id, percent) {
    const el = document.getElementById(id);
    if (!el) return;
    const p = Math.min(Math.max(percent, 0), 100);
    el.style.width = `${p}%`;
    el.classList.remove("tv-bar-warn", "tv-bar-danger");
    if (p >= 90) el.classList.add("tv-bar-danger");
    else if (p >= 70) el.classList.add("tv-bar-warn");
  }

  // ─── Refresh widget content ──────────────────────────────────────────────
  async function updateUI() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    const model = ModelDetector.getModel();
    const modelName = ModelDetector.getDisplayName(model);
    const ctxPercent = TokenCounter.getUsagePercent(conversationTokens);

    // Pill always shows context % (most relevant glance metric)
    document.getElementById("tv-pill-text").textContent =
      `${ctxPercent.toFixed(0)}%`;

    // Color the pill dot based on warning level
    const pillDot = panel.querySelector(".tv-pill-dot");
    pillDot.classList.remove("tv-dot-warn", "tv-dot-danger");
    if (ctxPercent >= 90) pillDot.classList.add("tv-dot-danger");
    else if (ctxPercent >= 70) pillDot.classList.add("tv-dot-warn");

    // Only update expanded content if visible
    if (!isExpanded) return;

    document.getElementById("tv-model").textContent = modelName;
    document.getElementById("tv-ctx-value").textContent =
      `${TokenCounter.formatTokenCount(conversationTokens)} / 200k`;
    setBar("tv-ctx-bar", ctxPercent);

    const usage = await UsageTracker.getUsage();
    if (usage) {
      const { session, weekly } = usage;
      document.getElementById("tv-ses-value").textContent =
        session.limit ? `${session.used} / ${session.limit}` : `${session.used} msgs`;
      document.getElementById("tv-ses-reset").textContent =
        `resets in ${session.timeLeft}`;
      setBar("tv-ses-bar", session.percent);

      document.getElementById("tv-wk-value").textContent =
        weekly.limit ? `${weekly.used} / ${weekly.limit}` : `${weekly.used} msgs`;
      document.getElementById("tv-wk-reset").textContent =
        `resets in ${weekly.timeLeft}`;
      setBar("tv-wk-bar", weekly.percent);
    }
  }

  // ─── Toggle expand / collapse ────────────────────────────────────────────
  function expand() {
    const panel = document.getElementById(PANEL_ID);
    panel.classList.remove("tv-collapsed");
    panel.classList.add("tv-open");
    isExpanded = true;
    updateUI();
  }

  function collapse() {
    const panel = document.getElementById(PANEL_ID);
    panel.classList.remove("tv-open");
    panel.classList.add("tv-collapsed");
    isExpanded = false;
  }

  // ─── Inject into page ────────────────────────────────────────────────────
  function inject() {
    if (document.getElementById(PANEL_ID)) return;
    const panel = buildPanel();
    document.body.appendChild(panel);
    document.getElementById("tv-pill-btn").addEventListener("click", expand);
    document.getElementById("tv-close-btn").addEventListener("click", collapse);
    updateUI();
    refreshTimer = setInterval(updateUI, REFRESH_INTERVAL);
  }

  // ─── Watch for SPA navigation ────────────────────────────────────────────
  function watchNav() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        conversationTokens = 0;
        UsageTracker.invalidateCache();
        setTimeout(inject, 800);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ─── Boot ────────────────────────────────────────────────────────────────
  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        inject();
        watchNav();
      });
    } else {
      inject();
      watchNav();
    }
  }

  init();
})();
