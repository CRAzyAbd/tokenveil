// content.js — TokenVeil: native-feeling overlay for claude.ai
// Runs in MAIN world at document_start so we can intercept fetches.

(() => {
  const PANEL_ID = "tokenveil-panel";
  const REFRESH_INTERVAL = 2000;

  let conversationTokens = 0;
  let isExpanded = false;
  let lastUsage = null;

  // ─── HOOK FETCH IMMEDIATELY ────────────────────────────────────────────
  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await _fetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (url.includes("/chat_conversations/") && !url.includes("/usage")) {
        res.clone().json().then(data => processConversationData(data)).catch(() => {});
      }
    } catch (_) {}
    return res;
  };

  function processConversationData(data) {
    if (!data) return;
    const messages = data?.chat_messages ?? data?.messages ?? [];
    if (messages.length > 0) {
      conversationTokens = TokenCounter.countConversationTokens(messages);
      CacheTimer.updateFromMessages(messages);
    }
    updateUI();
  }

  function getOrgId() {
    const m = document.cookie.match(/lastActiveOrg=([^;]+)/);
    return m ? m[1] : null;
  }

  function getConversationIdFromUrl() {
    const m = location.pathname.match(/\/chat\/([a-f0-9-]+)/i);
    return m ? m[1] : null;
  }

  async function loadCurrentConversation() {
    const orgId = getOrgId();
    const convId = getConversationIdFromUrl();
    if (!orgId || !convId) return;
    try {
      const r = await fetch(
        `https://claude.ai/api/organizations/${orgId}/chat_conversations/${convId}?tree=True&rendering_mode=messages&render_all_tools=true`,
        { credentials: "include" }
      );
      if (r.ok) processConversationData(await r.json());
    } catch (e) {
      console.warn("[tokenveil] load conv failed:", e);
    }
  }

  // ─── BUILD WIDGET DOM ──────────────────────────────────────────────────
  function buildPanel() {
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "tv-panel tv-collapsed";
    panel.innerHTML = `
      <div class="tv-cache-pill" id="tv-cache-pill" title="Conversation cache — sending a follow-up before this expires is cheaper">
        <span class="tv-cache-icon">●</span>
        <span class="tv-cache-text" id="tv-cache-text">—</span>
      </div>

      <button class="tv-pill" id="tv-pill-btn" title="Click to expand">
        <span class="tv-pill-dot"></span>
        <span class="tv-pill-text" id="tv-pill-text">0%</span>
      </button>

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
          <div class="tv-stat-sub" id="tv-ctx-sub" style="display:none;"></div>
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

  function setBar(id, percent) {
    const el = document.getElementById(id);
    if (!el) return;
    const p = Math.min(Math.max(percent, 0), 100);
    el.style.width = `${p}%`;
    el.classList.remove("tv-bar-warn", "tv-bar-danger");
    if (p >= 90) el.classList.add("tv-bar-danger");
    else if (p >= 70) el.classList.add("tv-bar-warn");
  }

  // ─── UPDATE UI ─────────────────────────────────────────────────────────
  async function updateUI() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    // Cache pill — show only when cache is active
    const cache = CacheTimer.getStatus();
    const cachePill = document.getElementById("tv-cache-pill");
    if (cache.state === "active") {
      cachePill.classList.add("tv-cache-visible");
      document.getElementById("tv-cache-text").textContent = cache.text;
    } else {
      cachePill.classList.remove("tv-cache-visible");
    }

    // Fetch usage always (needed for the pill)
    lastUsage = await UsageTracker.getUsage();

    // Pill shows SESSION % (5-hour usage)
    const sessionPercent = lastUsage?.session.percent ?? 0;
    document.getElementById("tv-pill-text").textContent = `${sessionPercent.toFixed(0)}%`;
    const pillDot = panel.querySelector(".tv-pill-dot");
    pillDot.classList.remove("tv-dot-warn", "tv-dot-danger");
    if (sessionPercent >= 90) pillDot.classList.add("tv-dot-danger");
    else if (sessionPercent >= 70) pillDot.classList.add("tv-dot-warn");

    // Context % is still needed for the expanded view (kept for reference below)
    const ctxPercent = TokenCounter.getUsagePercent(conversationTokens);

    if (!isExpanded) return;

    // Model
    document.getElementById("tv-model").textContent =
      ModelDetector.getDisplayName(ModelDetector.getModel());

    // Context
    const isCompacting = conversationTokens > TokenCounter.CONTEXT_LIMIT;
    const ctxValueEl = document.getElementById("tv-ctx-value");
    const ctxSubEl = document.getElementById("tv-ctx-sub");
    if (isCompacting) {
      ctxValueEl.textContent = `${TokenCounter.formatTokenCount(conversationTokens)} raw`;
      ctxSubEl.textContent = `active ~200k · compacted`;
      ctxSubEl.style.display = "block";
    } else {
      ctxValueEl.textContent = `${TokenCounter.formatTokenCount(conversationTokens)} / 200k`;
      ctxSubEl.style.display = "none";
    }
    setBar("tv-ctx-bar", Math.min(ctxPercent, 100));

    // Session + Weekly (use cached lastUsage from above)
    if (lastUsage) {
      const { session, weekly } = lastUsage;
      document.getElementById("tv-ses-value").textContent = `${session.percent.toFixed(0)}%`;
      document.getElementById("tv-ses-reset").textContent = `resets in ${session.timeLeft}`;
      setBar("tv-ses-bar", session.percent);

      document.getElementById("tv-wk-value").textContent = `${weekly.percent.toFixed(0)}%`;
      document.getElementById("tv-wk-reset").textContent = `resets in ${weekly.timeLeft}`;
      setBar("tv-wk-bar", weekly.percent);
    }
  }

  function expand() {
    const p = document.getElementById(PANEL_ID);
    p.classList.remove("tv-collapsed");
    p.classList.add("tv-open");
    isExpanded = true;
    updateUI();
  }

  function collapse() {
    const p = document.getElementById(PANEL_ID);
    p.classList.remove("tv-open");
    p.classList.add("tv-collapsed");
    isExpanded = false;
  }

  function inject() {
    if (!document.body) return;
    if (document.getElementById(PANEL_ID)) return;
    document.body.appendChild(buildPanel());
    document.getElementById("tv-pill-btn").addEventListener("click", expand);
    document.getElementById("tv-close-btn").addEventListener("click", collapse);
    loadCurrentConversation();
    updateUI();
    setInterval(updateUI, REFRESH_INTERVAL);
  }

  function waitForBodyAndInject() {
    if (document.body) { inject(); watchNav(); return; }
    new MutationObserver((mut, obs) => {
      if (document.body) { obs.disconnect(); inject(); watchNav(); }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  function watchNav() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        conversationTokens = 0;
        CacheTimer.reset();
        UsageTracker.invalidateCache();
        setTimeout(loadCurrentConversation, 800);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForBodyAndInject);
  }
  waitForBodyAndInject();
})();
