/**
 * Virtual Filesystem (VFS) for birthday-terminal.
 * Simulates standard Linux file hierarchies and operations.
 */

export class Filesystem {
  constructor(fsRoot, currentLevelIndex = 0) {
    this.root = fsRoot;
    this.username = `alief${currentLevelIndex + 1}`;
    // Set initial working directory to /home/aliefX
    this.currentPath = ["home", this.username];
  }

  changeUser(levelIndex) {
    this.username = `alief${levelIndex + 1}`;
    this.currentPath = ["home", this.username];
  }

  /**
   * Helper to parse arguments, preserving spaces within quotes and handling backslashes.
   */
  static parseArgs(argString) {
    const args = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";
    let escapeNext = false;

    for (let i = 0; i < argString.length; i++) {
      const char = argString[i];
      if (escapeNext) {
        current += char;
        escapeNext = false;
        continue;
      }
      if (char === "\\") {
        escapeNext = true;
        continue;
      }
      if (inQuotes) {
        if (char === quoteChar) {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"' || char === "'") {
          inQuotes = true;
          quoteChar = char;
        } else if (char === " " || char === "\t") {
          if (current) {
            args.push(current);
            current = "";
          }
        } else {
          current += char;
        }
      }
    }
    if (current) {
      args.push(current);
    }
    return args;
  }

  /**
   * Translates a Unix path (supporting ~ and /) to an absolute directory array.
   */
  resolvePathArray(pathStr) {
    if (!pathStr) {
      return [...this.currentPath];
    }

    let parts = [];
    let startPath = [];

    if (pathStr === "~") {
      return ["home", this.username];
    } else if (pathStr.startsWith("~/")) {
      startPath = ["home", this.username];
      parts = pathStr.slice(2).split("/").filter(p => p !== "");
    } else if (pathStr.startsWith("/")) {
      startPath = [];
      parts = pathStr.split("/").filter(p => p !== "");
    } else {
      startPath = [...this.currentPath];
      parts = pathStr.split("/").filter(p => p !== "");
    }

    const tempPath = [...startPath];
    for (const part of parts) {
      if (part === ".") {
        continue;
      } else if (part === "..") {
        if (tempPath.length > 0) {
          tempPath.pop();
        }
      } else {
        tempPath.push(part);
      }
    }
    return tempPath;
  }

  /**
   * Resolves a path string into a node in the VFS.
   * Returns { node, pathArray, error }
   */
  resolvePath(pathStr) {
    const targetPath = this.resolvePathArray(pathStr);
    const node = this.getNodeFromPath(targetPath);
    if (!node) {
      return { node: null, error: `No such file or directory: ${pathStr}` };
    }
    return { node, pathArray: targetPath };
  }

  getNodeFromPath(pathArray) {
    let current = this.root;
    for (const part of pathArray) {
      if (!current || current.type !== "dir" || !current.children || !current.children[part]) {
        return null;
      }
      current = current.children[part];
    }
    return current;
  }

  getPwd() {
    return "/" + this.currentPath.join("/");
  }

  /**
   * Gets the formatted prompt path (replacing /home/alief with ~)
   */
  getPromptPath() {
    const pwd = this.getPwd();
    const homePath = `/home/${this.username}`;
    if (pwd === homePath) {
      return "~";
    }
    if (pwd.startsWith(homePath + "/")) {
      return "~" + pwd.slice(homePath.length);
    }
    return pwd;
  }
}
