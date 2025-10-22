// popup.js

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const postCountInput = document.getElementById("postCount");
const statusDiv = document.getElementById("status");
const logsDiv = document.getElementById("logs");
const progressContainer = document.getElementById("progressContainer");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

let isRunning = false;

// Add log entry
function addLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement("div");
  logEntry.className = "log-entry";
  logEntry.textContent = `[${timestamp}] ${message}`;
  logsDiv.appendChild(logEntry);
  logsDiv.scrollTop = logsDiv.scrollHeight;
}

// Update status
function updateStatus(text, state) {
  statusDiv.textContent = text;
  statusDiv.className = `status ${state}`;
}

// Update progress
function updateProgress(current, total) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  progressFill.style.width = `${percentage}%`;
  progressFill.textContent = `${percentage}%`;
  progressText.textContent = `${current} / ${total} completed`;
}

// Start button
startBtn.addEventListener("click", async () => {
  const postCount = parseInt(postCountInput.value, 10);

  if (!postCount || postCount < 1) {
    alert("Please enter a valid number!");
    return;
  }

  if (postCount > 100) {
    if (
      !confirm(
        `You're about to comment on ${postCount} posts. This may take a while. Continue?`
      )
    ) {
      return;
    }
  }

  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  if (!currentTab.url.includes("facebook.com")) {
    alert("⚠️ Please open Facebook first!");
    return;
  }

  // Clear logs
  logsDiv.innerHTML = "";
  addLog("Starting automation...");

  // Update UI
  isRunning = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  postCountInput.disabled = true;
  updateStatus("⏳ Running automation...", "running");
  progressContainer.classList.add("active");
  updateProgress(0, postCount);

  // Inject and start
  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      files: ["content.js"],
    });

    await chrome.tabs.sendMessage(currentTab.id, {
      command: "start",
      count: postCount,
    });

    addLog(`✅ Automation started for ${postCount} posts`);
  } catch (error) {
    addLog(`❌ Error: ${error.message}`);
    resetUI();
  }
});

// Stop button
stopBtn.addEventListener("click", async () => {
  if (!isRunning) return;

  addLog("🛑 Stopping automation...");
  updateStatus("🛑 Stopping...", "stopped");

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  try {
    await chrome.tabs.sendMessage(currentTab.id, {
      command: "stop",
    });
    addLog("✅ Stop signal sent");
  } catch (error) {
    addLog(`⚠️ ${error.message}`);
  }

  // Don't reset immediately, wait for complete message
});

// Reset UI
function resetUI() {
  isRunning = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  postCountInput.disabled = false;
  updateStatus("✓ Ready to start", "ready");
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "log") {
    addLog(message.message);
  } else if (message.action === "progress") {
    updateProgress(message.current, message.total);
  } else if (message.action === "complete") {
    addLog(`🎉 Automation complete! (${message.completed}/${message.total})`);
    updateStatus(
      `✅ Completed: ${message.completed}/${message.total}`,
      "ready"
    );
    resetUI();
  }
});

// Initial log
addLog("Extension loaded and ready");
addLog("Open Facebook news feed and click Start");
