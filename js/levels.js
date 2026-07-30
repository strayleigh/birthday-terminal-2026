/**
 * Levels management for birthday-terminal.
 */

export class LevelsManager {
  static async fetchLevels() {
    const res = await fetch(`./data/levels.json?v=${Date.now()}`);
    return await res.json();
  }

  /**
   * Generates the initial VFS structure matching a real Linux scheme:
   * /home/alief
   * Additional level nodes are injected based on player level.
   */
  static generateVFS(levels, currentLevel) {
    const root = {
      type: "dir",
      children: {
        "home": {
          type: "dir",
          children: {}
        }
      }
    };

    // Populate all user directories up to the current unlocked level
    const homeDir = root.children.home;
    for (let i = 0; i < currentLevel; i++) {
      const username = `alief${i + 1}`;
      const lv = levels[i];
      if (lv && lv.fs_nodes) {
        homeDir.children[username] = {
          type: "dir",
          children: JSON.parse(JSON.stringify(lv.fs_nodes))
        };
      }
    }

    return root;
  }
}
