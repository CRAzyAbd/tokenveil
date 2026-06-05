// cacheTimer.js — Tracks how long the conversation remains cached
// Claude caches context for ~5 minutes from the last message timestamp.

const CacheTimer = (() => {
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  let lastMessageTime = null;

  function setLastMessageTime(timestamp) {
    if (!timestamp) return;
    const ts = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
    if (!isNaN(ts)) lastMessageTime = ts;
  }

  function updateFromMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return;
    // Find the latest message timestamp
    let latest = 0;
    for (const msg of messages) {
      const t = msg?.created_at || msg?.updated_at || msg?.timestamp;
      if (t) {
        const tms = new Date(t).getTime();
        if (!isNaN(tms) && tms > latest) latest = tms;
      }
    }
    if (latest > 0) lastMessageTime = latest;
  }

  function getRemaining() {
    if (!lastMessageTime) return null;
    const elapsed = Date.now() - lastMessageTime;
    const remaining = CACHE_TTL_MS - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  function getStatus() {
    const remaining = getRemaining();
    if (remaining === null) return { state: "idle", text: "—", percent: 0 };
    if (remaining === 0)    return { state: "expired", text: "expired", percent: 0 };
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const text = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const percent = (remaining / CACHE_TTL_MS) * 100;
    return { state: "active", text, percent };
  }

  function touch() {
    lastMessageTime = Date.now();
  }

  function reset() {
    lastMessageTime = null;
  }

  return { setLastMessageTime, updateFromMessages, getRemaining, getStatus, touch, reset };
})();
