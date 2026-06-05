// popup.js — TokenVeil popup

document.getElementById("open-claude").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: "https://claude.ai" });
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const badge = document.getElementById("status");
  if (tab?.url?.includes("claude.ai")) {
    badge.textContent = "Active";
  } else {
    badge.textContent = "Inactive";
    badge.style.background = "rgba(139, 135, 130, 0.15)";
    badge.style.color = "var(--text-muted)";
  }
});
