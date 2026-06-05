// usageTracker.js — Session and weekly usage from Claude's /usage API

const UsageTracker = (() => {
  let cachedUsage = null;
  let lastFetched = 0;
  const CACHE_TTL = 60 * 1000;

  function getOrgId() {
    const m = document.cookie.match(/lastActiveOrg=([^;]+)/);
    return m ? m[1] : null;
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
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  async function getUsage() {
    const data = await fetchUsage();
    if (!data) return null;
    return {
      session: {
        percent:  data.five_hour?.utilization ?? 0,
        timeLeft: formatTimeLeft(data.five_hour?.resets_at),
      },
      weekly: {
        percent:  data.seven_day?.utilization ?? 0,
        timeLeft: formatTimeLeft(data.seven_day?.resets_at),
      },
    };
  }

  function invalidateCache() {
    cachedUsage = null;
    lastFetched = 0;
  }

  return { getUsage, invalidateCache };
})();
