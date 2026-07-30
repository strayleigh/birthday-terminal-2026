/**
 * xterm.js terminal wrapper and input/keystroke router.
 */

import { Filesystem } from "./filesystem.js";
import { LevelsManager } from "./levels.js";
import { CommandsProcessor } from "./commands.js";
import { StorageManager } from "./storage.js";
import { FlagValidator } from "./submit.js";
import { UIManager } from "./ui.js";

const HOSTNAME = "chall";
const sleep = ms => new Promise(res => setTimeout(res, ms));

export class TerminalApp {
  constructor() {
    this.levels = [];
    this.currentLevelData = null;
    this.currentLevelIndex = 0;
    this.fs = null;
    this.term = null;
    this.cmdProcessor = null;
    
    this.currentInput = "";
    this.commandHistory = [];
    this.historyIndex = -1;
    this.isBooting = true;
    this.startTime = Date.now();
  }

  async init() {
    // Set connecting tab title
    UIManager.updateTitle("Connecting...");

    this.levels = await LevelsManager.fetchLevels();

    if (StorageManager.isCompleted()) {
      const viewRewardBtn = document.getElementById("view-reward-btn");
      if (viewRewardBtn) {
        viewRewardBtn.classList.remove("hidden");
      }
    }

    const savedLevel = StorageManager.getCurrentLevel();
    this.currentLevelIndex = Math.min(Math.max(0, savedLevel - 1), this.levels.length - 1);
    this.currentLevelData = this.levels[this.currentLevelIndex];

    // Generate VFS dynamically based on level
    const rootFS = LevelsManager.generateVFS(this.levels, this.currentLevelIndex + 1);
    this.fs = new Filesystem(rootFS, this.currentLevelIndex);
    this.cmdProcessor = new CommandsProcessor(this);

    // Update Minimal Level Indicator
    UIManager.updateLevelIndicator(this.currentLevelIndex, this.levels.length);
    UIManager.renderLevelProgress(this.currentLevelIndex, this.levels.length);
    UIManager.renderAchievements();

    // Setup Theme Selector
    this.setupThemeSelector();

    // Start Real-Time Diagnostics Panel Updater
    UIManager.startDiagnosticsUpdater(this.startTime);

    // Wait for custom fonts to load so character grids align correctly
    if (document.fonts) {
      await document.fonts.ready;
    }

    this.setupXterm();
    await this.bootSequence();
  }

  setupXterm() {
    const container = document.getElementById("terminal-container");
    container.innerHTML = "";

    this.term = new Terminal({
      theme: this.getTerminalThemeColors(StorageManager.getTheme()),
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 15,
      cursorBlink: true,
      cursorStyle: "block",
      cols: 80,
      rows: 24,
      convertEol: true
    });

    const fitAddon = new FitAddon.FitAddon();
    this.term.loadAddon(fitAddon);
    this.term.open(container);
    
    // Setup Ctrl+Shift+C & Ctrl+Shift+V Copy-Paste handlers
    this.term.attachCustomKeyEventHandler((e) => {
      // Ctrl + Shift + C OR Ctrl + C (when text is highlighted) -> Copy selection
      const hasSelection = this.term.getSelection() && this.term.getSelection().length > 0;
      const isCtrlShiftC = e.ctrlKey && e.shiftKey && (e.key === "c" || e.key === "C");
      const isCtrlCWithSelection = e.ctrlKey && !e.shiftKey && (e.key === "c" || e.key === "C") && hasSelection;

      if (isCtrlShiftC || isCtrlCWithSelection) {
        if (e.type === "keydown") {
          const selection = this.term.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection).catch(err => {
              console.error("Clipboard copy failed: ", err);
            });
          }
        }
        return false;
      }

      return true;
    });
    
    // Defer fit calculation so the browser can settle the flexbox widths first
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (e) {}
    }, 150);

    window.addEventListener("resize", () => {
      try {
        fitAddon.fit();
      } catch (e) {}
    });

    this.term.onData(data => this.handleInput(data));
  }

  async bootSequence() {
    this.isBooting = true;
    
    this.term.writeln("\x1b[33mEstablishing secure connection...\x1b[0m");
    await sleep(1500);
    this.term.writeln("\x1b[32mConnected.\x1b[0m");
    await sleep(1000);
    this.term.writeln("");
    await sleep(500);
    this.term.writeln("Welcome to challengeOS 1.0 LTS (GNU/Linux 6.16.0-chall x86_64)");
    await sleep(1000);
    this.term.writeln("");
    await sleep(400);
    this.term.writeln(" * Documentation : type \"help\"");
    await sleep(600);
    this.term.writeln(" * Challenge     : Solve all levels");
    await sleep(600);
    this.term.writeln(" * Reward        : Locked");
    await sleep(1000);
    this.term.writeln("");
    await sleep(400);
    this.term.writeln("Last login: Never");
    this.term.writeln("");
    await sleep(800);

    // Update terminal prompt and title
    this.updatePromptState();
    this.term.write(this.getPrompt());
    this.term.focus();
    this.isBooting = false;
  }

  getPrompt() {
    const username = `alief${this.currentLevelIndex + 1}`;
    const displayPath = this.fs.getPromptPath();
    // Green username/host, white path and symbol
    return `\x1b[1;32m${username}@${HOSTNAME}\x1b[0m:${displayPath}$ `;
  }

  updatePromptState() {
    const username = `alief${this.currentLevelIndex + 1}`;
    const titlePath = this.fs.getPromptPath();
    let display = titlePath.replace("~", "");
    if (display.startsWith("/")) {
      display = display.slice(1);
    }
    if (display) {
      UIManager.updateTitle(`${username}@${HOSTNAME}:${display}`);
    } else {
      UIManager.updateTitle(`${username}@${HOSTNAME}`);
    }
  }

  handleInput(data) {
    if (this.isBooting) return;

    if (this.cmdProcessor && this.cmdProcessor.playInterval) {
      if (data === "\u0003" || data === "q" || data === "Q" || data === "\u001b") {
        this.cmdProcessor.stopPlayback();
        this.currentInput = "";
        this.updatePromptState();
        this.term.write(this.getPrompt());
      }
      return;
    }

    switch (data) {
      case "\r": // Enter
        this.term.write("\r\n");
        const trimmed = this.currentInput.trim();
        
        // Execute
        if (trimmed) {
          this.commandHistory.push(this.currentInput);
          this.historyIndex = this.commandHistory.length;
          
          const output = this.cmdProcessor.execute(trimmed);
          if (output !== null && output !== undefined) {
            this.term.writeln(output);
          }
        }
        
        this.currentInput = "";
        this.updatePromptState();
        if (!this.cmdProcessor.playInterval) {
          this.term.write(this.getPrompt());
        }
        break;

      case "\x7f": // Backspace
      case "\b":
        if (this.currentInput.length > 0) {
          this.currentInput = this.currentInput.slice(0, -1);
          this.term.write("\b \b");
        }
        break;

      case "\u0003": // Ctrl+C
        this.term.write("^C\r\n");
        this.currentInput = "";
        this.term.write(this.getPrompt());
        break;

      case "\u0009": // Tab completion
        this.handleTabCompletion();
        break;

      case "\u001b[A": // Arrow Up
        this.handleHistoryUp();
        break;

      case "\u001b[B": // Arrow Down
        this.handleHistoryDown();
        break;

      default:
        // Accept typical printable characters
        if (data >= " " && data <= "~") {
          this.currentInput += data;
          this.term.write(data);
        }
        break;
    }
  }

  handleHistoryUp() {
    if (this.commandHistory.length === 0) return;
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.clearInputLine();
      this.currentInput = this.commandHistory[this.historyIndex];
      this.term.write(this.currentInput);
    }
  }

  handleHistoryDown() {
    if (this.historyIndex < this.commandHistory.length - 1) {
      this.historyIndex++;
      this.clearInputLine();
      this.currentInput = this.commandHistory[this.historyIndex];
      this.term.write(this.currentInput);
    } else if (this.historyIndex === this.commandHistory.length - 1) {
      this.historyIndex++;
      this.clearInputLine();
      this.currentInput = "";
    }
  }

  clearInputLine() {
    this.term.write("\r");
    this.term.write("\x1b[K");
    this.term.write(this.getPrompt());
  }

  handleTabCompletion() {
    const words = this.currentInput.split(" ");
    const lastWord = words[words.length - 1] || "";

    if (words.length <= 1) {
      const commands = [
        "help", "pwd", "ls", "cd", "cat", "clear", "whoami", "hostname",
        "uname", "id", "date", "echo", "find", "grep", "file", "strings",
        "base64", "hint", "submit", "sudo", "exit"
      ];
      const matches = commands.filter(c => c.startsWith(lastWord));
      if (matches.length === 1) {
        const completion = matches[0].slice(lastWord.length);
        this.currentInput += completion + " ";
        this.term.write(completion + " ");
      } else if (matches.length > 1) {
        this.term.write("\r\n" + matches.join("   ") + "\r\n");
        this.term.write(this.getPrompt() + this.currentInput);
      }
      return;
    }

    // Auto complete files/folders relative to current path
    const currentDirNode = this.fs.getNodeFromPath(this.fs.currentPath);
    if (currentDirNode && currentDirNode.children) {
      const files = Object.keys(currentDirNode.children);
      const matches = files.filter(f => f.startsWith(lastWord));
      if (matches.length === 1) {
        let completion = matches[0].slice(lastWord.length);
        if (matches[0].includes(" ")) {
          if (!lastWord.startsWith('"') && !lastWord.startsWith("'")) {
            completion = completion.replace(/ /g, "\\ ");
          }
        }
        this.currentInput += completion;
        this.term.write(completion);
      } else if (matches.length > 1) {
        this.term.write("\r\n" + matches.join("   ") + "\r\n");
        this.term.write(this.getPrompt() + this.currentInput);
      }
    }
  }

  submitFlag(flagInput) {
    const result = FlagValidator.validate(
      flagInput,
      this.currentLevelData,
      this.levels,
      this.currentLevelIndex
    );

    if (result.accepted) {
      this.term.writeln("\x1b[1;32m✔ Flag Accepted\x1b[0m\r\n");
      const completedLevelNum = this.currentLevelIndex + 1;
      UIManager.unlockAchievement(`stage${completedLevelNum}`);

      if (!result.isLastLevel) {
        this.currentLevelIndex = result.nextIndex;
        this.currentLevelData = this.levels[this.currentLevelIndex];

        // Regenerate and refresh VFS
        const rootFS = LevelsManager.generateVFS(this.levels, this.currentLevelIndex + 1);
        this.fs.root = rootFS;
        this.fs.changeUser(this.currentLevelIndex);

        UIManager.updateLevelIndicator(this.currentLevelIndex, this.levels.length);
        UIManager.renderLevelProgress(this.currentLevelIndex, this.levels.length);
        
        this.term.writeln(`\x1b[33mEntering Level ${this.currentLevelIndex + 1}...\x1b[0m`);
        this.term.writeln("");
      } else {
        this.handleGameCompleted();
      }
    } else {
      this.term.writeln("\x1b[1;31m✖ Incorrect Flag. Try again or check 'hint'.\x1b[0m");
    }
  }

  handleGameCompleted() {
    this.term.writeln("\x1b[1;32m🎉 CONGRATULATIONS! ALL CHALLENGES COMPLETED! 🎉\x1b[0m");
    this.term.writeln("\x1b[33mSession closed. Redirecting to reward vault...\x1b[0m");

    // Mark game as completed in storage
    StorageManager.setCompleted(true);

    setTimeout(() => {
      window.location.href = "reward.html";
    }, 2500);
  }

  setupThemeSelector() {
    const selector = document.getElementById("theme-selector");
    if (!selector) return;

    // Load saved theme
    const savedTheme = StorageManager.getTheme();
    selector.value = savedTheme;
    UIManager.applyTheme(savedTheme);

    selector.addEventListener("change", (e) => {
      const selectedTheme = e.target.value;
      StorageManager.setTheme(selectedTheme);
      UIManager.applyTheme(selectedTheme);
      if (this.term) {
        try {
          // Officially merge options in xterm.js by passing only mutated fields
          this.term.options = { theme: this.getTerminalThemeColors(selectedTheme) };
        } catch (err) {
          try {
            // Fallback for older versions
            this.term.setOption("theme", this.getTerminalThemeColors(selectedTheme));
          } catch (e2) {
            console.error("Failed to update xterm theme:", e2);
          }
        }
      }
    });
  }

  getTerminalThemeColors(themeName) {
    const themes = {
      dark: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#4af626",
        cursorAccent: "#0d1117",
        selectionBackground: "rgba(74, 246, 38, 0.25)",
        black: "#000000",
        red: "#ff5555",
        green: "#4af626",
        yellow: "#ffb86c",
        blue: "#8be9fd",
        magenta: "#ff79c6",
        cyan: "#8be9fd",
        white: "#c9d1d9"
      },
      ubuntu: {
        background: "#300a24",
        foreground: "#dfdbd2",
        cursor: "#e95420",
        cursorAccent: "#300a24",
        selectionBackground: "rgba(233, 84, 32, 0.3)",
        black: "#2c001e",
        red: "#ef2929",
        green: "#8ae234",
        yellow: "#fce94f",
        blue: "#3465a4",
        magenta: "#75507b",
        cyan: "#06989a",
        white: "#eee9e4"
      },

      dracula: {
        background: "#282a36",
        foreground: "#f8f8f2",
        cursor: "#ff79c6",
        cursorAccent: "#282a36",
        selectionBackground: "rgba(189, 147, 249, 0.3)",
        black: "#21222c",
        red: "#ff5555",
        green: "#50fa7b",
        yellow: "#f1fa8c",
        blue: "#bd93f9",
        magenta: "#ff79c6",
        cyan: "#8be9fd",
        white: "#f8f8f2"
      },

    };
    return themes[themeName] || themes.dark;
  }
}
