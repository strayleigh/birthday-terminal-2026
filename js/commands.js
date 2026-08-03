import { UIManager } from "./ui.js";

/**
 * Commands processor for birthday-terminal.
 */

export class CommandsProcessor {
  constructor(appContext) {
    this.app = appContext; // reference to the terminal/app state
    this.playInterval = null;
  }

  execute(cmdLine) {
    if (cmdLine.includes("|")) {
      const parts = cmdLine.split("|");
      let lastOutput = "";
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        lastOutput = this.executeSingle(part, lastOutput);
      }
      return lastOutput;
    }
    return this.executeSingle(cmdLine);
  }

  executeSingle(cmdLine, stdin = "") {
    const args = this.app.fs.constructor.parseArgs(cmdLine);
    if (args.length === 0) return "";

    const command = args[0];
    const rawParams = cmdLine.slice(args[0].length).trim();

    if (command.startsWith("./")) {
      return this.handleExecuteScript(command);
    }

    switch (command) {
      case "bash":
      case "sh":
        return this.handleExecuteScript(args[1]);
      case "help":
        return `Available commands:
  help      - Display this help information
  pwd       - Print name of current/working directory
  ls        - List directory contents
  cd        - Change the working directory
  cat       - Concatenate files and print on the standard output
  clear     - Clear the terminal screen
  whoami    - Print effective user name
  hostname  - Show system's host name
  uname     - Print system information
  id        - Print real and effective user and group IDs
  date      - Print the system date and time
  neofetch  - Display system specs with birthday ASCII art
  echo      - Write arguments to the standard output
  find      - Search for files in a directory hierarchy
  grep      - Print lines matching a pattern
  file      - Determine file type
  strings   - Print the sequences of printable characters in files
  base64    - Base64 encode/decode data and print to standard output
  rot13     - ROT13 decode data and print to standard output
  exiftool  - Read meta information in files
  xxd       - Make a hex dump or do the reverse
  feh       - Open image files in a graphical popup window
  mpv       - Play video files in a graphical popup window
  vlc       - Play video files in a graphical popup window
  hint      - Show instructions/tips for the current level
  submit    - Submit a flag for validation (submit FLAG{...})`;

      case "pwd":
        return this.app.fs.getPwd();

      case "ls":
        return this.handleLs(args);

      case "cd":
        return this.handleCd(args[1]);

      case "cat":
        return this.handleCat(args[1]);

      case "feh":
      case "eog":
      case "mpv":
      case "vlc":
      case "mplayer":
      case "mpg123":
      case "mpg321":
      case "play":
      case "aplay":
        return this.handleView(args);

      case "walter":
        return this.handleWalterShortcut();

      case "exiftool":
        return this.handleExiftool(args);

      case "xxd":
        return this.handleXxd(args, stdin);

      case "rot13":
        return this.handleRot13(args[1]);

      case "clear":
        this.app.term.clear();
        return null;

      case "whoami":
        return `alief${this.app.currentLevelIndex + 1}`;

      case "hostname":
        return "chall";

      case "uname":
        if (args[1] === "-a") {
          return "Linux chall 6.16.0-chall x86_64 GNU/Linux";
        }
        return "Linux";

      case "id":
        {
          const uid = 1000 + this.app.currentLevelIndex;
          const user = `alief${this.app.currentLevelIndex + 1}`;
          return `uid=${uid}(${user}) gid=${uid}(${user}) groups=${uid}(${user}),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev)`;
        }

      case "date":
        return new Date().toString();

      case "neofetch":
        return this.handleNeofetch();

      case "echo":
        return args.slice(1).join(" ");

      case "find":
        return this.handleFind(args[1]);

      case "grep":
        return this.handleGrep(args[1], args[2], stdin);

      case "file":
        return this.handleFile(args.slice(1));

      case "strings":
        return this.handleStrings(args[1]);

      case "base64":
        return this.handleBase64(args.slice(1), stdin);

      case "hint":
        return `\x1b[36mHint:\x1b[0m ${this.app.currentLevelData.hint}`;

      case "submit":
        if (!args[1]) {
          return "\x1b[31msubmit: missing flag. Usage: submit FLAG{...}\x1b[0m";
        }
        this.app.submitFlag(args[1]);
        return null;

      case "sudo":
        return "Nice try :)";

      case "rm":
        if (rawParams.includes("-rf") && rawParams.includes("/")) {
          return "Permission denied.\nThis server is still needed.";
        }
        return "rm: permission denied.";

      case "exit":
        return "Session cannot be terminated yet.";

      default:
        return `${command}: command not found`;
    }
  }

  handleLs(args) {
    let optA = false;
    let optL = false;
    let optR = false;
    const fileArgs = [];

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith("-")) {
        if (arg.includes("a")) optA = true;
        if (arg.includes("l")) optL = true;
        if (arg.includes("R")) optR = true;
      } else {
        fileArgs.push(arg);
      }
    }

    const target = fileArgs[0] || ".";
    const { node, error } = this.app.fs.resolvePath(target);
    if (error) return `ls: cannot access '${target}': ${error}`;

    if (node.type !== "dir") {
      return target;
    }

    if (optR) {
      return this.handleLsRecursive(target, optA, optL);
    }

    let items = Object.keys(node.children || {});
    if (optA) {
      items = [".", "..", ...items];
    } else {
      items = items.filter(item => !item.startsWith("."));
    }

    if (items.length === 0) return "";

    if (optL) {
      const user = `alief${this.app.currentLevelIndex + 1}`;
      return items.map(name => {
        let size = 0;
        let details = "";
        if (name === "." || name === "..") {
          details = `drwxr-xr-x 2 ${user} ${user} 4096 Jul 20 19:24`;
        } else {
          const item = node.children[name];
          if (item.type === "dir") {
            details = `drwxr-xr-x 2 ${user} ${user} 4096 Jul 20 19:24`;
          } else {
            size = item.content ? item.content.length : 0;
            const sizeStr = String(size).padStart(4, " ");
            details = `-rw-r--r-- 1 ${user} ${user} ${sizeStr} Jul 20 19:24`;
          }
        }
        return `${details} ${name}`;
      }).join("\n");
    } else {
      return items.join("   ");
    }
  }

  handleLsRecursive(target, optA, optL) {
    const lines = [];
    const self = this;
    const user = `alief${this.app.currentLevelIndex + 1}`;

    function recurse(currentPathStr) {
      const { node, error } = self.app.fs.resolvePath(currentPathStr);
      if (error) return;

      if (node.type !== "dir") return;

      let items = Object.keys(node.children || {});
      if (optA) {
        items = [".", "..", ...items];
      } else {
        items = items.filter(item => !item.startsWith("."));
      }

      lines.push(`${currentPathStr}:`);

      if (items.length > 0) {
        if (optL) {
          const formatted = items.map(name => {
            let details = "";
            if (name === "." || name === "..") {
              details = `drwxr-xr-x 2 ${user} ${user} 4096 Jul 20 19:24`;
            } else {
              const item = node.children[name];
              if (item.type === "dir") {
                details = `drwxr-xr-x 2 ${user} ${user} 4096 Jul 20 19:24`;
              } else {
                const size = item.content ? item.content.length : 0;
                const sizeStr = String(size).padStart(4, " ");
                details = `-rw-r--r-- 1 ${user} ${user} ${sizeStr} Jul 20 19:24`;
              }
            }
            return `${details} ${name}`;
          }).join("\n");
          lines.push(formatted);
        } else {
          lines.push(items.join("   "));
        }
      }

      lines.push(""); // spacer line

      const subdirs = Object.keys(node.children || {}).filter(name => {
        if (!optA && name.startsWith(".")) return false;
        return node.children[name].type === "dir";
      }).sort();

      for (const subdir of subdirs) {
        const prefix = currentPathStr === "." ? "" : (currentPathStr.endsWith("/") ? currentPathStr : currentPathStr + "/");
        const nextPathStr = currentPathStr === "." ? `./${subdir}` : `${prefix}${subdir}`;
        recurse(nextPathStr);
      }
    }

    recurse(target);

    // Trim trailing empty line
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    return lines.join("\n");
  }

  handleCd(pathStr) {
    if (!pathStr) {
      // cd to home dir
      const user = `alief${this.app.currentLevelIndex + 1}`;
      this.app.fs.currentPath = ["home", user];
      return "";
    }
    const { node, pathArray, error } = this.app.fs.resolvePath(pathStr);
    if (error) return `cd: ${error}`;
    if (node.type !== "dir") {
      return `-bash: cd: ${pathStr}: Not a directory`;
    }
    this.app.fs.currentPath = pathArray;
    return "";
  }

  handleCat(pathStr) {
    if (!pathStr) {
      return "cat: missing file operand";
    }
    const { node, error } = this.app.fs.resolvePath(pathStr);
    if (error) return `cat: ${pathStr}: ${error}`;
    if (node.type === "dir") {
      return `cat: ${pathStr}: Is a directory`;
    }
    if (node.isImage) {
      return `cat: ${pathStr}: Cannot display binary image file. Use 'view ${pathStr}' to view graphical images.`;
    }
    return node.content || "";
  }

  handleFind(pathStr) {
    const target = pathStr || ".";
    const { node, error } = this.app.fs.resolvePath(target);
    if (error) return `find: '${target}': ${error}`;

    const results = [];
    const traverse = (currNode, currPath) => {
      results.push(currPath);
      if (currNode.type === "dir" && currNode.children) {
        for (const childName of Object.keys(currNode.children)) {
          traverse(currNode.children[childName], `${currPath}/${childName}`);
        }
      }
    };

    traverse(node, target);
    return results.join("\n");
  }

  handleGrep(pattern, pathStr, stdin = "") {
    if (!pattern) return "usage: grep [pattern] [file]";
    
    let content = "";
    if (pathStr) {
      const { node, error } = this.app.fs.resolvePath(pathStr);
      if (error) return `grep: ${pathStr}: ${error}`;
      if (node.type === "dir") return `grep: ${pathStr}: Is a directory`;
      content = node.content || "";
    } else if (stdin) {
      content = stdin;
    } else {
      return "grep: missing file operand or stdin input";
    }

    const lines = content.split("\n");
    const matched = lines.filter(line => line.includes(pattern));
    return matched.join("\n");
  }

  handleFile(fileList) {
    if (!fileList || fileList.length === 0) return "file: missing filename";

    // Expand wildcards (e.g. inhere/* or *)
    const expandedFiles = [];
    for (const pathStr of fileList) {
      if (pathStr.includes("*")) {
        const parts = pathStr.split("/");
        const wildcard = parts.pop(); // typically '*'
        const parentPath = parts.length > 0 ? parts.join("/") : ".";
        
        const { node, error } = this.app.fs.resolvePath(parentPath);
        if (!error && node && node.type === "dir" && node.children) {
          Object.keys(node.children).sort().forEach(childName => {
            expandedFiles.push(parentPath === "." ? childName : `${parentPath}/${childName}`);
          });
        } else {
          expandedFiles.push(pathStr);
        }
      } else {
        expandedFiles.push(pathStr);
      }
    }

    const results = [];
    for (const pathStr of expandedFiles) {
      const { node, error } = this.app.fs.resolvePath(pathStr);
      if (error) {
        results.push(`file: '${pathStr}': ${error}`);
        continue;
      }

      if (node.type === "dir") {
        results.push(`${pathStr}: directory`);
      } else if (node.isBinary) {
        results.push(`${pathStr}: ${node.content}`);
      } else {
        results.push(`${pathStr}: ASCII text`);
      }
    }

    return results.join("\n");
  }

  handleStrings(pathStr) {
    if (!pathStr) return "strings: missing filename";
    const { node, error } = this.app.fs.resolvePath(pathStr);
    if (error) return `strings: '${pathStr}': ${error}`;

    if (node.type === "dir") {
      return `strings: ${pathStr}: Is a directory`;
    }

    if (node.isBinary) {
      // Mock printable characters
      return "ELF\n@\n8\n@@\n(";
    }
    return node.content || "";
  }

  handleBase64(args, stdin = "") {
    let decode = false;
    let filename = "";

    for (const arg of args) {
      if (arg === "-d" || arg === "--decode") {
        decode = true;
      } else if (!arg.startsWith("-")) {
        filename = arg;
      }
    }

    let content = "";
    if (filename) {
      const { node, error } = this.app.fs.resolvePath(filename);
      if (error) return `base64: ${filename}: ${error}`;
      if (node.type === "dir") return `base64: ${filename}: Is a directory`;
      content = (node.content || "").trim();
    } else if (stdin) {
      content = stdin.trim();
    } else {
      return "base64: missing file operand or stdin input";
    }

    if (decode) {
      try {
        return atob(content);
      } catch (e) {
        return "base64: invalid input (unable to decode)";
      }
    } else {
      try {
        return btoa(content);
      } catch (e) {
        return "base64: error encoding content";
      }
    }
  }

  handleNeofetch() {
    const uptimeSecs = Math.floor((Date.now() - this.app.startTime) / 1000);
    const mins = Math.floor(uptimeSecs / 60);
    const secs = uptimeSecs % 60;
    const uptimeStr = mins > 0 ? `${mins} mins, ${secs} secs` : `${secs} secs`;

    const user = `alief${this.app.currentLevelIndex + 1}`;
    return [
      `\x1b[1;36m⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\x1b[0m  \x1b[1;32m${user}\x1b[0m@\x1b[1;32mchall\x1b[0m`,
      `\x1b[1;36m⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⡀⠀⠀⠀⠀⠀⠀\x1b[0m  ---------------------`,
      `\x1b[1;36m⠀⠀⠀⢀⡤⠤⡤⠞⠁⠀⡀⠀⠨⡙⠦⡠⠤⠀⠀⠀\x1b[0m  \x1b[1;36mOS\x1b[0m: challengeOS 1.0 LTS`,
      `\x1b[1;36m⠀⠀⠀⡛⢐⠉⡠⠂⠀⡰⠣⣀⠀⠑⠄⠈⡄⢃⠀⠀\x1b[0m  \x1b[1;36mKernel\x1b[0m: 6.16.0-chall x86_64`,
      `\x1b[1;36m⠀⠀⠀⡇⡸⠀⡄⣀⡾⠀⠀⢠⣽⢄⢀⠢⠸⠸⡀⠀\x1b[0m  \x1b[1;36mUptime\x1b[0m: ${uptimeStr}`,
      `\x1b[1;36m⠲⣒⢞⢺⡁⢸⠊⣠⡄⠀⠀⢠⣄⠈⡇⠰⣾⠚⢖⠖\x1b[0m  \x1b[1;36mShell\x1b[0m: custom-js-sh`,
      `\x1b[1;36m⠀⠀⢑⡶⣙⣦⢣⠀⠀⡀⡀⡀⠀⠀⣅⢤⣜⠕⠉⠀\x1b[0m  \x1b[1;36mCPU\x1b[0m: Intel Core i67`,
      `\x1b[1;36m⠀⠀⡇⠃⢺⠞⠛⢧⣀⣉⣉⢀⣀⠭⠿⢬⣄⢘⠀⠀\x1b[0m  \x1b[1;36mMemory\x1b[0m: 256MB / 1GB`,
      `\x1b[1;36m⠀⢸⠁⢀⢻⠀⠀⡎⠀⠐⠒⠓⡄⠀⠹⠀⢸⢟⠿⠀\x1b[0m  \x1b[1;36mHost\x1b[0m: chall`
    ].join("\r\n");
  }

  handleView(args) {
    if (args.length < 2) {
      return `${args[0]}: missing file operand`;
    }
    const pathStr = args[1];
    const { node, error } = this.app.fs.resolvePath(pathStr);
    if (error) return `${args[0]}: ${pathStr}: ${error}`;
    if (node.type !== "file") return `${args[0]}: ${pathStr}: Is a directory`;
    
    const filename = pathStr.split("/").pop();

    if (node.isAudio || pathStr.endsWith(".mp3")) {
      const audio = document.getElementById("audio-viewer-content");
      let total = 230; // default fallback
      
      const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, "0");
        const s = (secs % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
      };

      if (audio) {
        audio.src = node.content;
        audio.load();
        audio.play().catch(e => console.log("Audio autoplay blocked: ", e));
        
        const updateDuration = () => {
          total = Math.round(audio.duration) || 230;
          this.app.term.write(`\r> 00:00 / ${formatTime(total)} [               ]`);
        };
        
        if (audio.readyState >= 1) {
          updateDuration();
        } else {
          audio.addEventListener("loadedmetadata", updateDuration, { once: true });
        }
      }
      
      if (this.playInterval) {
        clearInterval(this.playInterval);
      }
      
      let elapsed = 0;
      
      // Hide cursor
      this.app.term.write("\x1b[?25l");
      
      // Initial render with bracket frame
      this.app.term.write(`\r> 00:00 / ${formatTime(total)} [               ]`);
      
      this.playInterval = setInterval(() => {
        elapsed++;
        // Dynamically read total in case it loaded late
        if (audio && audio.duration) {
          total = Math.round(audio.duration);
        }
        
        if (elapsed > total) {
          this.stopPlayback();
          return;
        }
        
        const barLength = 15;
        const progress = Math.min(Math.round((elapsed / total) * barLength), barLength);
        const bar = "▬".repeat(progress) + " ".repeat(barLength - progress);
        
        this.app.term.write(`\r> ${formatTime(elapsed)} / ${formatTime(total)} [${bar}]`);
      }, 1000);
      
      return undefined;
    } else if (node.isImage || node.isVideo || pathStr.endsWith(".mp4")) {
      UIManager.openImageViewer(node.content, filename);
      return "";
    } else {
      return `${args[0]}: ${pathStr}: Not a viewable media file`;
    }
  }

  stopPlayback() {
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
      // Show cursor, print a newline, and redraw prompt
      this.app.term.write("\x1b[?25h\n");
      this.app.term.write(this.app.getPrompt());
    }
    const audio = document.getElementById("audio-viewer-content");
    if (audio) {
      audio.pause();
      audio.src = "";
    }
  }

  handleWalterShortcut() {
    const { node, error } = this.app.fs.resolvePath("walter.png");
    if (!error && node && node.isImage) {
      UIManager.openImageViewer(node.content, "walter.png");
      return "";
    }
    return "walter: command not found. This shortcut is only available in Stage 3.";
  }

  handleExiftool(args) {
    if (args.length < 2) {
      return "exiftool: missing file operand";
    }
    const pathStr = args[1];
    const { node, error } = this.app.fs.resolvePath(pathStr);
    if (error) return `exiftool: ${pathStr}: ${error}`;
    if (node.type === "dir") return `exiftool: ${pathStr}: Is a directory`;

    if (node.isImage && pathStr.endsWith("walter.png")) {
      return `ExifTool Version Number         : 12.40
File Name                       : walter.png
Directory                       : .
File Size                       : 142 KiB
File Modification Date/Time     : 2026:07:25 09:35:00+07:00
File Permissions                : -rw-r--r--
File Type                       : PNG
File Type Extension             : png
MIME Type                       : image/png
Image Width                     : 800
Image Height                    : 800
Bit Depth                       : 8
Color Type                      : RGB with Alpha
Comment                         : Say my name
XP Comment                      : 464c41477b68333173336e623372677d
Image Size                      : 800x800
Megapixels                      : 0.64`;
    }

    if (pathStr.endsWith("ryan_gosling.jpg") || pathStr.endsWith("ryan_gosling.jpeg")) {
      return `ExifTool Version Number         : 13.55
File Name                       : ryan_gosling.jpg
Directory                       : .
File Size                       : 29 kB
File Modification Date/Time     : 2026:07:30 21:08:25+07:00
File Access Date/Time           : 2026:07:30 21:08:25+07:00
File Inode Change Date/Time     : 2026:07:30 21:08:25+07:00
File Permissions                : -rw-r--r--
File Type                       : JPEG
File Type Extension             : jpg
MIME Type                       : image/jpeg
JFIF Version                    : 1.01
Resolution Unit                 : inches
X Resolution                    : 72
Y Resolution                    : 72
Comment                         : g01ng
Image Width                     : 506
Image Height                    : 505
Encoding Process                : Progressive DCT, Huffman coding
Bits Per Sample                 : 8
Color Components                : 3
Y Cb Cr Sub Sampling            : YCbCr4:2:0 (2 2)
Image Size                      : 506x505
Megapixels                      : 0.256`;
    }

    if (pathStr.endsWith("foto_dari_galang.jpeg")) {
      return `ExifTool Version Number         : 12.40
File Name                       : foto_dari_galang.jpeg
Directory                       : .
File Size                       : 45 KiB
File Modification Date/Time     : 2026:07:25 12:30:00+07:00
File Permissions                : -rw-r--r--
File Type                       : JPEG
File Type Extension             : jpeg
MIME Type                       : image/jpeg
Comment                         : ?_b1ng0?`;
    }

    if (pathStr.endsWith("join_the_dark_side.jpeg")) {
      return `ExifTool Version Number         : 12.40
File Name                       : join_the_dark_side.jpeg
Directory                       : .
File Size                       : 82 KiB
File Modification Date/Time     : 2026:07:25 12:30:00+07:00
File Permissions                : -rw-r--r--
File Type                       : JPEG
File Type Extension             : jpeg
MIME Type                       : image/jpeg
Comment                         : g01ng?_`;
    }

    if (pathStr.endsWith("hengker_sejati.png")) {
      return `ExifTool Version Number         : 12.40
File Name                       : hengker_sejati.png
Directory                       : .
File Size                       : 110 KiB
File Modification Date/Time     : 2026:07:25 12:30:00+07:00
File Permissions                : -rw-r--r--
File Type                       : PNG
File Type Extension             : png
MIME Type                       : image/png`;
    }

    return `ExifTool Version Number         : 12.40
File Name                       : ${pathStr.split("/").pop()}
Directory                       : .
File Size                       : ${node.content ? Math.ceil(node.content.length / 1024) : 0} KiB
File Permissions                : -rw-r--r--
Comment                         : No metadata comment available`;
  }

  handleXxd(args, stdin) {
    const isRevert = args.includes("-r");
    const isPlain = args.includes("-p");

    if (isRevert && isPlain) {
      const hex = stdin.trim().replace(/\s+/g, "");
      let str = "";
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      }
      return str;
    }

    if (args.length > 1) {
      const pathStr = args[args.length - 1];
      if (pathStr.startsWith("-")) {
        return "xxd: unsupported option";
      }
      const { node, error } = this.app.fs.resolvePath(pathStr);
      if (error) return `xxd: ${pathStr}: ${error}`;
      if (node.type === "dir") return `xxd: ${pathStr}: Is a directory`;
      
      const content = node.content || "";
      let result = "";
      for (let i = 0; i < content.length; i += 16) {
        const chunk = content.slice(i, i + 16);
        const hexParts = [];
        const asciiParts = [];
        for (let j = 0; j < 16; j++) {
          if (j < chunk.length) {
            const char = chunk[j];
            const code = char.charCodeAt(0);
            hexParts.push(code.toString(16).padStart(2, "0"));
            asciiParts.push(code >= 32 && code <= 126 ? char : ".");
          } else {
            hexParts.push("  ");
          }
        }
        const offset = i.toString(16).padStart(8, "0");
        const groupedHex = [];
        for (let k = 0; k < hexParts.length; k += 2) {
          groupedHex.push(hexParts[k] + (hexParts[k+1] || ""));
        }
        result += `${offset}: ${groupedHex.join(" ")}  ${asciiParts.join("")}\n`;
      }
      return result.trim();
    }

    return "xxd: missing operand. Usage: echo <hex> | xxd -r -p or xxd <file>";
  }

  handleRot13(inputStr) {
    if (!inputStr) {
      return "rot13: missing string or filename to decode";
    }
    
    // Check if the input is a file path
    const { node, error } = this.app.fs.resolvePath(inputStr);
    let targetText = inputStr;
    if (!error && node && node.type === "file") {
      targetText = node.content || "";
    }

    // Apply ROT13 cipher shift
    return targetText.replace(/[a-zA-Z]/g, (c) => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
    });
  }

  handleExecuteScript(pathStr) {
    if (!pathStr) return "sh: missing script name";
    // Strip leading ./ if present
    const cleanPath = pathStr.startsWith("./") ? pathStr.slice(2) : pathStr;
    const { node, error } = this.app.fs.resolvePath(cleanPath);
    if (error) return `sh: ${pathStr}: ${error}`;
    if (node.type === "dir") return `sh: ${pathStr}: Is a directory`;

    const content = node.content || "";
    
    if (!cleanPath.endsWith(".sh") && !content.startsWith("#!")) {
      return `sh: ${pathStr}: permission denied`;
    }

    const lines = content.split("\n");
    const outputLines = [];
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith("#") || line === "") continue;
      
      if (line.startsWith("echo ")) {
        let text = line.slice(5).trim();
        // Remove surrounding quotes if present
        if (text.startsWith('"') && text.endsWith('"')) {
          text = text.slice(1, -1);
        } else if (text.startsWith("'") && text.endsWith("'")) {
          text = text.slice(1, -1);
        }
        
        // Remove standard echo flag flags (like -e) from display
        if (text.startsWith("-e ")) {
          text = text.slice(3).trim();
          if (text.startsWith('"') && text.endsWith('"')) {
            text = text.slice(1, -1);
          } else if (text.startsWith("'") && text.endsWith("'")) {
            text = text.slice(1, -1);
          }
        }
        
        // Decode hex escapes (e.g. \x31\x73\x5f -> 1s_) during execution
        text = text.replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16));
        });
        
        outputLines.push(text);
      } else if (line.startsWith("sleep ")) {
        // Ignored in output
      } else {
        const out = this.execute(line);
        if (out) outputLines.push(out);
      }
    }
    return outputLines.join("\n");
  }
}
