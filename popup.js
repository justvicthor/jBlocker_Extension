// popup.js
document.addEventListener("DOMContentLoaded", async () => {
    const sitesTextarea = document.getElementById("sites");
    const startTimeInput = document.getElementById("startTime");
    const endTimeInput = document.getElementById("endTime");
    const saveBtn = document.getElementById("saveBtn");
  
    // Load current settings on popup open
    const { blockedSites = [], startTime = "", endTime = "" } = await chrome.storage.sync.get([
      "blockedSites",
      "startTime",
      "endTime"
    ]);
  
    // Populate inputs
    sitesTextarea.value = blockedSites.join("\n");
    startTimeInput.value = startTime || "";
    endTimeInput.value = endTime || "";
  
    // Save button logic
    saveBtn.addEventListener("click", async () => {
      // Get user inputs
      const sites = sitesTextarea.value
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);
  
      const startTimeValue = startTimeInput.value; // "HH:MM"
      const endTimeValue = endTimeInput.value;     // "HH:MM"
  
      // Store them in chrome.storage.sync
      await chrome.storage.sync.set({
        blockedSites: sites,
        startTime: startTimeValue,
        endTime: endTimeValue
      });
  
      // Send a message to service worker so it can re-check and update rules immediately
      chrome.runtime.sendMessage({ action: "updateRules" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error updating rules:", chrome.runtime.lastError);
        } else {
          console.log("Rules updated:", response);
        }
      });
    });
  });
  