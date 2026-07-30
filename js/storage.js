/**
 * Progress Storage Manager for birthday-terminal.
 * Uses localStorage to save and restore player levels and terminal states.
 */

const STORAGE_KEY = "athi_terminal_progress";

export class StorageManager {
  static getProgress() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to read progress from localStorage", e);
    }
    return {
      currentLevel: 1,
      completed: false,
      theme: "dark",
      achievements: {
        stage1: false,
        stage2: false,
        stage3: false,
        stage4: false,
        stage5: false
      }
    };
  }

  static saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.error("Failed to save progress to localStorage", e);
    }
  }

  static getCurrentLevel() {
    return this.getProgress().currentLevel;
  }

  static setCurrentLevel(level) {
    const progress = this.getProgress();
    progress.currentLevel = level;
    this.saveProgress(progress);
  }

  static isCompleted() {
    return !!this.getProgress().completed;
  }

  static setCompleted(completed) {
    const progress = this.getProgress();
    progress.completed = completed;
    this.saveProgress(progress);
  }

  static getAchievements() {
    const progress = this.getProgress();
    if (!progress.achievements) {
      progress.achievements = {
        stage1: false,
        stage2: false,
        stage3: false,
        stage4: false,
        stage5: false
      };
    }
    return progress.achievements;
  }

  static unlockAchievement(id) {
    const progress = this.getProgress();
    if (!progress.achievements) {
      progress.achievements = {
        stage1: false,
        stage2: false,
        stage3: false,
        stage4: false,
        stage5: false
      };
    }
    progress.achievements[id] = true;
    this.saveProgress(progress);
  }

  static getTheme() {
    const progress = this.getProgress();
    return progress.theme || "dark";
  }

  static setTheme(themeName) {
    const progress = this.getProgress();
    progress.theme = themeName;
    this.saveProgress(progress);
  }

  static resetProgress() {
    this.saveProgress({
      currentLevel: 1,
      completed: false,
      theme: "dark",
      achievements: {
        stage1: false,
        stage2: false,
        stage3: false,
        stage4: false,
        stage5: false
      }
    });
  }
}
