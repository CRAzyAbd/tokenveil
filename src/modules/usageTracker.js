// usageTracker.js — Session and weekly usage from Claude's API

const UsageTracker = (() => {
  let cachedUsage = null;
  let lastFetched = 0;
  const CACHE_TTL = 60 * 1000;

  function getOrgId() {
    const match = document.cookie.match(/lastActiveOrg=([^;]+)/);
    return match ? match[1] : null;
  }

  async function fetchUsage() {
    const now = Date.now();
    if (cachedUsage && now - lastFetched < CACHE_TTL) return cachedUsage;

    const orgId = getOrgId();
    if (!orgId) return null;

    try {
      const res = await fetch(
        `https://claude.ai/api/organizations/${orgId}/usage`,
        { credentials: "include" }
      );
      if (!res.ok) return null;
      const data = await res.json();
      cachedUsage = data;
      lastFetched = now;
      return data;
    } catch (e) {
      console.warn("[tokenveil] Usage fetch failed:", e);
      return null;
    }
  }

  function formatTimeLeft(ts) {
    if (!ts) return "—";
    const diff = new Date(ts) - Date.now();
    if (diff <= 0) return "resetting";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  async function getUsage() {
    const data = await fetchUsage();
    if (!data) return null;
    return {
      session: {
        used:    data.message_count_session ?? 0,
        limit:   data.message_limit_session ?? null,
        percent: (data.session_utilization ?? 0) * 100,
        timeLeft: formatTimeLeft(data.session_reset_at),
      },
      weekly: {
        used:    data.message_count_week ?? 0,
        limit:   data.message_limit_week ?? null,
        percent: (data.week_utilization ?? 0) * 100,
        timeLeft: formatTimeLeft(data.week_reset_at),
      },
    };
  }

  function invalidateCache() {
    cachedUsage = null;
    lastFetched = 0;
  }

  return { getUsage, invalidateCache };
})();
