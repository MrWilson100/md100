/* ============================================
   MemDex100 Animations JavaScript — animations.js
   Scroll reveal, parallax, particles, interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ========== Scroll Reveal via IntersectionObserver ==========
  const revealElements = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-blur, .reveal-stagger'
  );

  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // ========== Scroll Progress Bar ==========
  const scrollProgress = document.getElementById('scrollProgress');
  if (scrollProgress) {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        scrollProgress.style.transform = `scaleX(${scrollTop / docHeight})`;
      }
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // ========== Mouse Parallax for Hero Orbs ==========
  const hero = document.getElementById('hero');
  if (hero) {
    const orbs = hero.querySelectorAll('.hero-orb');
    const spotlight = hero.querySelector('.hero-spotlight');

    if (orbs.length > 0) {
      hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;

        orbs.forEach((orb, i) => {
          const speed = (i + 1) * 20;
          orb.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
        });

        if (spotlight) {
          spotlight.style.left = e.clientX - rect.left + 'px';
          spotlight.style.top = e.clientY - rect.top + 'px';
        }
      });
    }
  }

  // ========== Card Tilt Effect ==========
  const tiltCards = document.querySelectorAll('.tilt-card');
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      card.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateY(0) rotateX(0) translateY(0)';
      card.style.transition = 'transform 0.5s ease';
    });

    card.addEventListener('mouseenter', () => {
      card.style.transition = 'none';
    });
  });

  // ========== Particle Canvas System ==========
  const canvas = document.getElementById('particleCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];
    const particleCount = 60;
    const connectionDistance = 140;
    let mouseX = -1000;
    let mouseY = -1000;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    function createParticles() {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.5 + 0.5,
          speedX: (Math.random() - 0.5) * 0.4,
          speedY: (Math.random() - 0.5) * 0.4,
          opacity: Math.random() * 0.4 + 0.1
        });
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(32, 158, 224, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const alpha = 0.08 * (1 - dist / connectionDistance);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(32, 158, 224, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        // Mouse interaction — particles near cursor glow brighter
        const mdx = particles[i].x - mouseX;
        const mdy = particles[i].y - mouseY;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < 200) {
          const glow = 0.3 * (1 - mDist / 200);
          ctx.beginPath();
          ctx.arc(particles[i].x, particles[i].y, particles[i].size + 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(32, 158, 224, ${glow})`;
          ctx.fill();
        }
      }

      requestAnimationFrame(animate);
    }

    resize();
    createParticles();
    animate();

    window.addEventListener('resize', () => {
      resize();
      createParticles();
    });

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
  }

  // ========== Parallax on Scroll ==========
  const parallaxElements = document.querySelectorAll('.parallax-bg');

  if (parallaxElements.length > 0) {
    const updateParallax = () => {
      parallaxElements.forEach(el => {
        const rect = el.parentElement.getBoundingClientRect();
        const speed = parseFloat(el.dataset.speed) || 0.3;
        const yPos = rect.top * speed;
        el.style.transform = `translateY(${yPos}px)`;
      });
    };

    window.addEventListener('scroll', () => {
      requestAnimationFrame(updateParallax);
    }, { passive: true });

    updateParallax();
  }

  // ========== Counter Animation ==========
  const counterElements = document.querySelectorAll('[data-count-to]');

  if (counterElements.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.countTo, 10);
          const duration = parseInt(el.dataset.countDuration, 10) || 2000;
          const suffix = el.dataset.countSuffix || '';
          const prefix = el.dataset.countPrefix || '';

          const startTime = performance.now();

          const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);

            el.textContent = prefix + current.toLocaleString() + suffix;

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              el.textContent = prefix + target.toLocaleString() + suffix;
            }
          };

          requestAnimationFrame(step);
          counterObserver.unobserve(el);
        }
      });
    }, {
      threshold: 0.5
    });

    counterElements.forEach(el => counterObserver.observe(el));
  }

  // ========== Typewriter Effect ==========
  const typewriterElements = document.querySelectorAll('[data-typewriter]');

  if (typewriterElements.length > 0) {
    const typewriterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const text = el.dataset.typewriter;
          const speed = parseInt(el.dataset.typewriterSpeed, 10) || 50;
          let i = 0;

          el.textContent = '';
          el.style.borderRight = '2px solid var(--color-accent-primary)';

          const type = () => {
            if (i < text.length) {
              el.textContent += text.charAt(i);
              i++;
              setTimeout(type, speed);
            } else {
              setTimeout(() => {
                el.style.borderRight = 'none';
              }, 1500);
            }
          };

          type();
          typewriterObserver.unobserve(el);
        }
      });
    }, {
      threshold: 0.5
    });

    typewriterElements.forEach(el => typewriterObserver.observe(el));
  }

  // ========== Magnetic Buttons ==========
  // Buttons subtly follow cursor on hover for a playful feel
  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
      btn.style.transition = 'transform 0.3s ease';
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.transition = 'none';
    });
  });

});
