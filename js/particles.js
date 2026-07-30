/**
 * Interactive Network Particle & Matrix Rain Background.
 * Renders drifting themed nodes connected by lines, matrix rain codes,
 * and mouse-hover glowing interactions.
 */

export function initParticles() {
  const canvas = document.getElementById("network-particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const mouse = { x: null, y: null };

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initMatrixStreams();
  });

  function getAccentColor() {
    const body = document.body;
    if (body.classList.contains("theme-ubuntu")) return "rgba(233, 84, 32,";
    if (body.classList.contains("theme-dracula")) return "rgba(255, 121, 198,";
    return "rgba(74, 246, 38,";
  }

  function getAccentHex() {
    const body = document.body;
    if (body.classList.contains("theme-ubuntu")) return "#e95420";
    if (body.classList.contains("theme-dracula")) return "#ff79c6";
    return "#4af626";
  }

  // --- Network Particles Section ---
  const particles = [];
  const maxParticles = 60;

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.35;
      this.vy = (Math.random() - 0.5) * 0.35;
      this.radius = Math.random() * 2 + 1;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;
    }

    draw() {
      let hoverGlow = 0;
      if (mouse.x !== null && mouse.y !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          hoverGlow = 1 - (dist / 120);
        }
      }

      ctx.beginPath();
      const currentRadius = this.radius + hoverGlow * 3.5;
      ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
      
      const opacity = 0.12 + hoverGlow * 0.78;
      ctx.fillStyle = `${getAccentColor()} ${opacity})`;
      
      if (hoverGlow > 0) {
        ctx.shadowBlur = hoverGlow * 15;
        ctx.shadowColor = getAccentHex();
      } else {
        ctx.shadowBlur = 0;
      }
      
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    }
  }

  for (let i = 0; i < maxParticles; i++) {
    particles.push(new Particle());
  }

  // --- Matrix Rain Section ---
  const fontSize = 14;
  let matrixStreams = [];

  class MatrixStream {
    constructor(x) {
      this.x = x;
      this.y = Math.random() * -1000;
      this.speed = Math.random() * 2.5 + 1.5;
      this.fontSize = fontSize;
      this.chars = [];
      this.length = Math.floor(Math.random() * 16 + 6);
    }

    update() {
      this.y += this.speed;
      if (this.y - (this.length * this.fontSize) > height) {
        this.y = -100;
        this.speed = Math.random() * 2.5 + 1.5;
      }
    }

    draw() {
      const charsList = "010101010101ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$";
      ctx.font = `${this.fontSize}px 'JetBrains Mono', monospace`;
      
      for (let i = 0; i < this.length; i++) {
        const charY = this.y - (i * this.fontSize);
        if (charY < 0 || charY > height) continue;

        const char = charsList[Math.floor(Math.random() * charsList.length)];
        const opacity = (1 - (i / this.length)) * 0.08; // extremely subtle matrix rain

        if (i === 0) {
          ctx.fillStyle = `${getAccentColor()} 0.25)`; // head is brighter
        } else {
          ctx.fillStyle = `${getAccentColor()} ${opacity})`;
        }
        ctx.fillText(char, this.x, charY);
      }
    }
  }

  function initMatrixStreams() {
    matrixStreams = [];
    const cols = Math.floor(width / (fontSize * 1.5));
    for (let i = 0; i < cols; i++) {
      matrixStreams.push(new MatrixStream(i * fontSize * 1.5));
    }
  }
  
  initMatrixStreams();

  // --- Animation Loop ---
  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Draw & Update Matrix Rain
    for (let i = 0; i < matrixStreams.length; i++) {
      matrixStreams[i].update();
      matrixStreams[i].draw();
    }

    // Draw & Update Network Particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.update();
      p.draw();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 140) {
          let lineHoverGlow = 0;
          if (mouse.x !== null && mouse.y !== null) {
            const mDist1 = Math.sqrt((p.x - mouse.x)**2 + (p.y - mouse.y)**2);
            const mDist2 = Math.sqrt((p2.x - mouse.x)**2 + (p2.y - mouse.y)**2);
            if (mDist1 < 120) lineHoverGlow = Math.max(lineHoverGlow, 1 - (mDist1 / 120));
            if (mDist2 < 120) lineHoverGlow = Math.max(lineHoverGlow, 1 - (mDist2 / 120));
          }

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          
          const baseOpacity = 0.08 * (1 - dist / 140);
          const currentLineOpacity = baseOpacity + lineHoverGlow * 0.28;
          ctx.strokeStyle = `${getAccentColor()} ${currentLineOpacity})`;
          ctx.lineWidth = lineHoverGlow > 0 ? 1.4 : 0.8;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animate);
  }

  animate();
}
