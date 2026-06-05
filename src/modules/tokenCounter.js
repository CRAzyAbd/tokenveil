// tokenCounter.js — Approximate token counting

const TokenCounter = (() => {
  const CHARS_PER_TOKEN = 4;
  const CONTEXT_LIMIT = 200000;

  function countTokens(text) {
    if (!text || typeof text !== "string") return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  function countConversationTokens(messages) {
    if (!Array.isArray(messages)) return 0;
    return messages.reduce((total, msg) => {
      const content = typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content || "");
      return total + countTokens(content);
    }, 0);
  }

  function getUsagePercent(tokenCount, limit = CONTEXT_LIMIT) {
    return Math.min((tokenCount / limit) * 100, 100);
  }

  function getWarningLevel(percent) {
    if (percent >= 90) return "danger";
    if (percent >= 70) return "warning";
    return "normal";
  }

  function formatTokenCount(count) {
    if (count >= 1000) return (count / 1000).toFixed(1) + "k";
    return count.toString();
  }

  return {
    countTokens,
    countConversationTokens,
    getUsagePercent,
    getWarningLevel,
    formatTokenCount,
    CONTEXT_LIMIT,
  };
})();
