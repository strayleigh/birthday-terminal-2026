import { StorageManager } from "./storage.js";

export class UIManager {
  static updateTitle(text) {
    document.title = text;
  }

  static updateLevelIndicator(currentIndex, totalLevels) {
    const el = document.getElementById("level-progress");
    if (!el) return;

    let indicators = [];
    for (let i = 0; i < totalLevels; i++) {
      if (i === currentIndex) {
        indicators.push("●"); // Current level
      } else if (i < currentIndex) {
        indicators.push("●"); // Completed levels
      } else {
        indicators.push("○"); // Locked levels
      }
    }
    el.textContent = `Level ${currentIndex + 1}  ${indicators.join(" ")}`;
  }



  static startDiagnosticsUpdater(startTime) {
    const cpuVal = document.getElementById("cpu-value");
    const cpuFill = document.getElementById("cpu-fill");
    const ramVal = document.getElementById("ram-value");
    const ramFill = document.getElementById("ram-fill");
    const uptimeVal = document.getElementById("uptime-value");

    setInterval(() => {
      // 1. Uptime Counter
      const totalSecs = Math.floor((Date.now() - startTime) / 1000);
      const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, "0");
      const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, "0");
      const secs = String(totalSecs % 60).padStart(2, "0");
      if (uptimeVal) {
        uptimeVal.textContent = `${hrs}:${mins}:${secs}`;
      }

      // 2. CPU fluctuations
      const cpu = Math.floor(Math.random() * 10) + 3;
      if (cpuVal && cpuFill) {
        cpuVal.textContent = `${cpu}%`;
        cpuFill.style.width = `${cpu}%`;
      }

      // 3. RAM usage fluctuations
      const ram = Math.floor(Math.random() * 15) + 246;
      if (ramVal && ramFill) {
        ramVal.textContent = `${ram}MB / 1GB`;
        const percentage = (ram / 1024) * 100;
        ramFill.style.width = `${percentage}%`;
      }
    }, 1000);
  }

  static renderLevelProgress(currentIndex, totalLevels) {
    const container = document.getElementById("stage-list-container");
    if (!container) return;

    container.innerHTML = "";
    for (let i = 0; i < totalLevels; i++) {
      const levelNum = i + 1;
      const item = document.createElement("div");
      item.className = "stage-item";

      if (i < currentIndex) {
        item.classList.add("completed");
        item.innerHTML = `<span class="stage-symbol">[✔]</span> <span class="stage-text">Level ${levelNum}</span>`;
      } else if (i === currentIndex) {
        item.classList.add("active");
        item.innerHTML = `<span class="stage-symbol">[▶]</span> <span class="stage-text">Level ${levelNum}</span>`;
      } else {
        item.classList.add("locked");
        item.innerHTML = `<span class="stage-symbol">[ ]</span> <span class="stage-text">Level ${levelNum}</span>`;
      }
      container.appendChild(item);
    }
  }

  static renderAchievements() {
    const achievements = StorageManager.getAchievements();
    const ids = ["stage1", "stage2", "stage3", "stage4", "stage5"];
    const originalTitles = {
      stage1: "Level 1: Hello Linux",
      stage2: "Level 2: Cat Enjoyer",
      stage3: "Level 3: Say My Name",
      stage4: "Level 4: Linux Larper",
      stage5: "Level 5: I use Arch btw"
    };

    ids.forEach((id, index) => {
      const el = document.getElementById(`ach-${id}`);
      if (!el) return;

      const checkbox = el.querySelector(".ach-checkbox");
      const text = el.querySelector(".ach-text");
      if (achievements[id]) {
        el.className = "achievement-item unlocked";
        if (checkbox) checkbox.textContent = "☑";
        if (text) text.textContent = originalTitles[id];
      } else {
        el.className = "achievement-item locked";
        if (checkbox) checkbox.textContent = "☐";
        if (text) text.textContent = `Level ${index + 1}: ░░░░░░░░░░`;
      }
    });
  }

  static unlockAchievement(id) {
    StorageManager.unlockAchievement(id);
    this.renderAchievements();
  }

  static applyTheme(themeName) {
    const body = document.body;
    // Remove existing themes
    const themes = ["theme-ubuntu", "theme-dracula"];
    themes.forEach(t => body.classList.remove(t));
    
    // Add new theme if not default dark
    if (themeName && themeName !== "dark") {
      body.classList.add(`theme-${themeName}`);
    }
  }

  static setupImageViewer() {
    const closeBtn = document.getElementById("close-image-viewer");
    const viewer = document.getElementById("image-viewer");
    if (!viewer) return;

    const stopMedia = () => {
      const video = document.getElementById("video-viewer-content");
      if (video) {
        video.pause();
        video.src = "";
      }
      const audio = document.getElementById("audio-viewer-content");
      if (audio) {
        audio.pause();
        audio.src = "";
      }
      const iframe = document.getElementById("youtube-viewer-content");
      if (iframe) {
        iframe.src = "";
      }
      if (window.app && window.app.commands && typeof window.app.commands.stopPlayback === "function") {
        window.app.commands.stopPlayback();
      }
    };

    // Close on red dot click
    if (closeBtn) {
      closeBtn.style.cursor = "pointer";
      closeBtn.addEventListener("click", () => {
        viewer.classList.add("hidden");
        stopMedia();
      });
    }

    // Close on clicking outside the image window (on the dark backdrop)
    viewer.addEventListener("click", (e) => {
      if (e.target === viewer) {
        viewer.classList.add("hidden");
        stopMedia();
      }
    });

    // Close on pressing 'q' or 'Escape' (matches native terminal utilities like feh)
    document.addEventListener("keydown", (e) => {
      if (!viewer.classList.contains("hidden")) {
        if (e.key === "Escape" || e.key === "q" || e.key === "Q") {
          viewer.classList.add("hidden");
          stopMedia();
          e.preventDefault();
        }
      }
    });
  }

  static openImageViewer(src, title) {
    const viewer = document.getElementById("image-viewer");
    const img = document.getElementById("image-viewer-content");
    const video = document.getElementById("video-viewer-content");
    const audio = document.getElementById("audio-viewer-content");
    const iframe = document.getElementById("youtube-viewer-content");
    const titleEl = document.getElementById("image-viewer-title");
    if (viewer && img && video && audio && iframe && titleEl) {
      const isVideo = src.endsWith(".mp4") || title.endsWith(".mp4") || src.includes("giphy.mp4");
      const isAudio = src.endsWith(".mp3") || title.endsWith(".mp3") || src.includes("unravel.mp3");
      const isYoutube = src.includes("youtube.com") || src.includes("youtu.be");

      if (isYoutube) {
        img.classList.add("hidden");
        video.classList.add("hidden");
        audio.classList.add("hidden");
        iframe.classList.remove("hidden");
        
        let videoId = "";
        if (src.includes("v=")) {
          videoId = src.split("v=")[1].split("&")[0];
        } else if (src.includes("youtu.be/")) {
          videoId = src.split("youtu.be/")[1].split("?")[0];
        } else if (src.includes("embed/")) {
          videoId = src.split("embed/")[1].split("?")[0];
        } else if (src.includes("shorts/")) {
          videoId = src.split("shorts/")[1].split("?")[0];
        }
        
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        titleEl.textContent = `youtube-dl: ${title}`;
      } else if (isVideo) {
        img.classList.add("hidden");
        audio.classList.add("hidden");
        iframe.classList.add("hidden");
        video.classList.remove("hidden");
        video.src = src;
        video.load();
        video.play().catch(e => console.log("Video auto-play blocked: ", e));
        titleEl.textContent = `mpv: ${title}`;
      } else if (isAudio) {
        video.classList.add("hidden");
        iframe.classList.add("hidden");
        img.classList.remove("hidden");
        audio.classList.remove("hidden");
        
        // Show dithered L image when playing music
        img.src = "images/l_dithered.png";
        img.style.maxHeight = "350px";
        img.style.objectFit = "cover";
        
        audio.src = src;
        audio.load();
        audio.play().catch(e => console.log("Audio auto-play blocked: ", e));
        titleEl.textContent = `mpg123: ${title}`;
      } else {
        video.classList.add("hidden");
        audio.classList.add("hidden");
        iframe.classList.add("hidden");
        img.classList.remove("hidden");
        img.src = src;
        img.style.maxHeight = "";
        img.style.objectFit = "contain";
        titleEl.textContent = `feh: ${title}`;
      }
      viewer.classList.remove("hidden");
    }
  }
}
