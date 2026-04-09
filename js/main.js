/* ============================================
   MemDex100 Main JavaScript — main.js
   Navigation, modals, smooth scroll, utilities
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ========== Nav Height (menu + tickers) ==========
  const navEl = document.querySelector('.nav');
  if (navEl) {
    const updateNavPadding = () => {
      const h = navEl.offsetHeight;
      document.body.style.paddingTop = h + 'px';
    };
    updateNavPadding();
    setTimeout(updateNavPadding, 500);
    setTimeout(updateNavPadding, 1500);
    setTimeout(updateNavPadding, 3000);
    window.addEventListener('resize', updateNavPadding, { passive: true });
  }

  // ========== Sticky Navigation ==========
  const nav = document.querySelector('.nav');
  if (nav) {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      nav.classList.toggle('nav-scrolled', currentScrollY > 50);

      // Hide/show nav on mobile based on scroll direction
      if (currentScrollY > 100 && currentScrollY > lastScrollY) {
        nav.classList.add('nav-hidden');
      } else {
        nav.classList.remove('nav-hidden');
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on load in case page is already scrolled
    handleScroll();
  }

  // ========== Hamburger / Mobile Menu ==========
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
      document.body.classList.toggle('modal-open');
    });

    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
        document.body.classList.remove('modal-open');
      });
    });

    // Close on overlay click (the mobile menu background)
    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
        document.body.classList.remove('modal-open');
      }
    });
  }

  // ========== Smooth Scroll for Anchor Links ==========
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      // Skip if it's just "#" or empty
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = parseInt(
          getComputedStyle(document.documentElement)
            .getPropertyValue('--nav-height')
        ) || 70;
        window.scrollTo({
          top: target.offsetTop - offset,
          behavior: 'smooth'
        });
      }
    });
  });

  // ========== Modal Handling ==========
  // Open modal via data-modal attribute
  document.querySelectorAll('[data-modal]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = document.getElementById(trigger.dataset.modal);
      if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
      }
    });
  });

  // Close modal via .modal-close button
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
      }
    });
  });

  // Close modal by clicking overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        const modal = overlay.closest('.modal');
        if (modal) {
          modal.classList.remove('active');
          document.body.classList.remove('modal-open');
        }
      }
    });
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
      });
      document.body.classList.remove('modal-open');
    }
  });

  // ========== Active Nav Link Highlighting ==========
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  if (navLinks.length > 0 && sections.length > 0) {
    const highlightNav = () => {
      const scrollY = window.scrollY + 100;

      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
          navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
              link.classList.add('active');
            }
          });
        }
      });
    };

    window.addEventListener('scroll', highlightNav, { passive: true });
  }

  // ========== Back to Top Button ==========
  const backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ========== Current Year in Footer ==========
  const yearEl = document.querySelector('.current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // ========== 3D Tilt Card Effect ==========
  document.querySelectorAll('.tilt-card').forEach(card => {
    const inner = card.querySelector('.tilt-card-inner');
    if (!inner) return;

    const maxTilt = 12;

    // Desktop: mouse hover tilt + glow
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotateX = (0.5 - y) * maxTilt;
      const rotateY = (x - 0.5) * maxTilt;

      inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
      inner.style.boxShadow = `
        ${(x - 0.5) * -30}px ${(y - 0.5) * -30}px 60px rgba(0, 41, 254, 0.45),
        0 0 100px rgba(32, 158, 224, 0.25)
      `;
    });

    card.addEventListener('mouseleave', () => {
      inner.style.transform = '';
      inner.style.boxShadow = '0 20px 60px rgba(0, 41, 254, 0.35), 0 0 80px rgba(32, 158, 224, 0.15)';
    });

    // Mobile: device orientation tilt
    if (window.DeviceOrientationEvent) {
      let orientationActive = false;

      const handleOrientation = (e) => {
        if (!orientationActive) return;
        const beta = Math.max(-30, Math.min(30, e.beta || 0));
        const gamma = Math.max(-30, Math.min(30, e.gamma || 0));
        const rotateX = (beta / 30) * maxTilt * 0.5;
        const rotateY = (gamma / 30) * maxTilt * 0.5;
        inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      };

      // Activate gyroscope when card is in viewport
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          orientationActive = entry.isIntersecting;
          if (!orientationActive) {
            inner.style.transform = '';
          }
        });
      }, { threshold: 0.3 });

      observer.observe(card);

      // iOS 13+ requires permission request
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        document.addEventListener('touchstart', () => {
          DeviceOrientationEvent.requestPermission().then(state => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation, { passive: true });
            }
          }).catch(() => {});
        }, { once: true });
      } else {
        window.addEventListener('deviceorientation', handleOrientation, { passive: true });
      }
    }
  });

});
