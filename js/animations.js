/* ============================================
   MemDex100 Animations JavaScript — animations.js
   Scroll reveal via IntersectionObserver, parallax
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ========== Scroll Reveal via IntersectionObserver ==========
  const revealElements = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-stagger'
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

    // Initial position
    updateParallax();
  }

  // ========== Counter Animation ==========
  // Animates numbers from 0 to their target value
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

          let start = 0;
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
  // Usage: <span data-typewriter="Text to type" data-typewriter-speed="50"></span>
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
              // Blink cursor then remove
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

});
