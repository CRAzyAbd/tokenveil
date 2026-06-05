// modelDetector.js — Detects active Claude model

const ModelDetector = (() => {
  const MODEL_NAMES = {
    "claude-opus-4":     "Opus 4",
    "claude-sonnet-4":   "Sonnet 4",
    "claude-haiku-4":    "Haiku 4",
    "claude-opus-3":     "Opus 3",
    "claude-sonnet-3-7": "Sonnet 3.7",
    "claude-sonnet-3-5": "Sonnet 3.5",
    "claude-haiku-3":    "Haiku 3",
  };

  let detected = null;

  // Hook fetch to read model from API responses
  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await _fetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
      if (url?.includes("chat_conversations")) {
        res.clone().json().then(data => {
          const model = data?.model ?? data?.settings?.model ?? null;
          if (model) detected = model;
        }).catch(() => {});
      }
    } catch (_) {}
    return res;
  };

  function getModel() {
    return detected || "claude-sonnet-4";
  }

  function getDisplayName(modelKey) {
    if (!modelKey) return "Claude";
    const key = Object.keys(MODEL_NAMES).find(k =>
      modelKey.toLowerCase().includes(k.toLowerCase())
    );
    return key ? MODEL_NAMES[key] : "Claude";
  }

  return { getModel, getDisplayName };
})();
