import { initParticles } from "./particles.js";
import { StorageManager } from "./storage.js";

document.addEventListener("DOMContentLoaded", () => {
  // Load and apply the saved theme
  const savedTheme = StorageManager.getTheme();
  const body = document.body;
  const themes = ["theme-ubuntu", "theme-dracula"];
  themes.forEach(t => body.classList.remove(t));
  if (savedTheme && savedTheme !== "dark") {
    body.classList.add(`theme-${savedTheme}`);
  }

  // Start background particles
  initParticles();

  const verificationScreen = document.getElementById("verification-screen");
  const decryptScreen = document.getElementById("decrypt-screen");
  const lootBox = document.getElementById("loot-box");
  const steamGift = document.getElementById("steam-gift");

  // Perform security verification check with visual feedback
  setTimeout(() => {
    const achievements = StorageManager.getAchievements();
    const allAchievementsUnlocked = achievements.stage1 && achievements.stage2 && achievements.stage3 && achievements.stage4 && achievements.stage5;
    const isCompleted = StorageManager.isCompleted();

    if (!isCompleted || !allAchievementsUnlocked) {
      verificationScreen.textContent = "Access Denied: Incomplete Challenges. Redirecting...";
      verificationScreen.style.color = "#ef4444";
      verificationScreen.style.textShadow = "0 0 10px rgba(239, 68, 68, 0.5)";
      
      setTimeout(() => {
        window.location.replace("index.html");
      }, 2000);
    } else {
      // Pass verification
      verificationScreen.classList.add("hidden");
      decryptScreen.classList.remove("hidden");

      // Animate dots on decrypting loader
      let dots = 0;
      const interval = setInterval(() => {
        dots = (dots + 1) % 4;
        decryptScreen.textContent = "Decrypting gift" + ".".repeat(dots);
      }, 400);

      // Show Vault after decryption loading finished
      setTimeout(() => {
        clearInterval(interval);
        decryptScreen.classList.add("hidden");
        lootBox.classList.remove("hidden");
      }, 2500);
    }
  }, 1500);

  // Setup Vault opening click listener
  lootBox.addEventListener("click", () => {
    lootBox.classList.add("opening");
    setTimeout(() => {
      lootBox.classList.add("hidden");
      steamGift.classList.remove("hidden");
      steamGift.classList.add("reveal");

      // Show the premium intro modal popup
      const introModal = document.getElementById("intro-modal");
      if (introModal) {
        introModal.classList.remove("hidden");
        // Force browser layout reflow before adding transition class
        introModal.offsetHeight;
        introModal.classList.add("show");

        // Setup dismiss listener
        const dismissModal = () => {
          introModal.classList.remove("show");
          setTimeout(() => {
            introModal.classList.add("hidden");
          }, 400);
          window.removeEventListener("click", dismissModal);
        };

        // Delay registering click listener to prevent instant dismissal
        setTimeout(() => {
          window.addEventListener("click", dismissModal);
        }, 150);
      }
    }, 1000);
  });
});
