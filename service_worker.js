// service_worker.js

// A helper function to remove all dynamic rules before adding new ones.
async function clearExistingRules() {
    try {
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIds = rules.map(r => r.id);
      if (ruleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIds
        });
      }
    } catch (error) {
      console.error("Failed to clear existing rules: ", error);
    }
  }
  
  // This function adds new blocking rules for the given array of domains.
  async function addBlockingRules(domains) {
    // Each rule must have a unique numeric ID. We'll just generate them from 1..N
    // for the new set of rules.
    const newRules = domains.map((domain, index) => ({
      id: index + 1,
      action: { type: "block" },
      condition: {
        // block if the URL's host *contains* the specified domain
        // This might be adjusted for exact domain matching, subdomains, etc.
        urlFilter: domain,
        resourceTypes: ["main_frame"]
      }
    }));
  
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules
      });
      console.log("Blocking rules added:", newRules);
    } catch (error) {
      console.error("Failed to add new rules: ", error);
    }
  }
  
  // Check whether we are within the blocking time window
  function isWithinBlockingWindow(startTime, endTime) {
    // startTime/endTime in "HH:MM" format
    if (!startTime || !endTime) return false;
  
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
    const [startH, startM] = startTime.split(":").map(n => parseInt(n, 10));
    const startMinutes = startH * 60 + startM;
  
    const [endH, endM] = endTime.split(":").map(n => parseInt(n, 10));
    const endMinutes = endH * 60 + endM;
  
    if (startMinutes < endMinutes) {
      // Normal case: e.g. block from 09:00 to 17:00
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else if (startMinutes > endMinutes) {
      // Over midnight case: e.g. block from 22:00 to 06:00
      return (currentMinutes >= startMinutes) || (currentMinutes < endMinutes);
    } else {
      // start == end => 24 hours
      return true; 
    }
  }
  
  // Function to update rules: if we are in the blocking window, block the sites; otherwise, allow them.
  async function updateRules() {
    try {
      const { blockedSites = [], startTime, endTime } = await chrome.storage.sync.get([
        "blockedSites",
        "startTime",
        "endTime"
      ]);
  
      // Remove existing dynamic rules.
      await clearExistingRules();
  
      // If current time is within the blocking window, add the blocking rules.
      if (isWithinBlockingWindow(startTime, endTime)) {
        await addBlockingRules(blockedSites);
      }
    } catch (error) {
      console.error("Failed to update rules:", error);
    }
  }
  
  // Listen for messages from the popup requesting a rules update
  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "updateRules") {
      await updateRules();
      sendResponse({ status: "ok" });
    }
  });
  
  // Schedule periodic checks (every minute) to see if we should enable or disable block rules
  setInterval(updateRules, 60_000);
  
  // Also run once when the service worker starts
  updateRules();
  