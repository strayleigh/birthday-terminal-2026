import { TerminalApp } from "./terminal.js";
import { UIManager } from "./ui.js";
import { StorageManager } from "./storage.js";
import { initParticles } from "./particles.js";

// Main entry point for birthday-terminal
window.addEventListener("DOMContentLoaded", () => {
  // Start particle background
  initParticles();

  const app = new TerminalApp();
  app.init();

  // Setup image viewer window controls
  UIManager.setupImageViewer();

  // Setup progress reset handler
  const resetProgressBtn = document.getElementById("reset-progress");
  if (resetProgressBtn) {
    resetProgressBtn.addEventListener("click", () => {
      if (confirm("Reset progress? Anda harus mulai dari awal.")) {
        StorageManager.resetProgress();
        location.reload();
      }
    });
  }
});
