/* Maison Créange · comportements du site
   Mouvement : GSAP + ScrollTrigger + Lenis (chargés en defer avant ce fichier).
   Sans ces bibliothèques, ou avec « réduire les animations », tout reste visible et fonctionnel. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  let local = null, session = null;
  try { local = window.localStorage; local.getItem('x'); } catch (e) { local = null; }
  try { session = window.sessionStorage; session.getItem('x'); } catch (e) { session = null; }

  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger, Lenis = window.Lenis;
  const MOTION = root.classList.contains('motion') && !!(gsap && ScrollTrigger);
  let lenis = null;

  /* 0. Défilement fluide */
  if (MOTION) {
    gsap.registerPlugin(ScrollTrigger);
    if (Lenis) {
      lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, wheelMultiplier: 1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  } else {
    root.classList.remove('has-intro', 'is-arriving', 'mono-on');
  }
  /* Défilement déclenché par le site (ancre, haut de page) : l'en-tête ne doit pas se cacher */
  let programmatic = 0;
  const scrollTo = (target, opts = {}) => {
    programmatic = Date.now() + 1600;
    if (lenis) lenis.scrollTo(target, { offset: -(($('[data-header]') || {}).offsetHeight || 0), duration: 1.4, ...opts });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: root.classList.contains('motion') ? 'smooth' : 'auto' });
    else target.scrollIntoView({ behavior: root.classList.contains('motion') ? 'smooth' : 'auto' });
  };

  /* 1. En-tête : fond plein hors du haut de page, masqué en descendant, rappelé en remontant */
  const header = $('[data-header]');
  const solidAlways = document.body.hasAttribute('data-header-solid');
  const heroEl = $('[data-vhero]');
  let lastY = window.scrollY;
  const updateHeader = () => {
    if (!header) return;
    const y = window.scrollY;
    /* Sur l'accueil, l'en-tête reste visible tant que la vidéo d'ouverture est à l'écran */
    const keepUntil = heroEl ? heroEl.offsetHeight * .85 : 160;
    header.classList.toggle('is-solid', solidAlways || y > 40);
    if (MOTION && !document.body.classList.contains('menu-open') && Date.now() > programmatic) {
      if (y > lastY + 4 && y > keepUntil) header.classList.add('is-hidden');
      else if (y < lastY - 4 || y <= keepUntil) header.classList.remove('is-hidden');
    }
    lastY = y;
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
  if (header) header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* 2. Menu mobile */
  const toggle = $('.menu-toggle');
  const menu = $('#menu-mobile');
  const label = toggle && $('.menu-toggle__label', toggle);
  const openMenu = () => {
    menu.hidden = false; toggle.setAttribute('aria-expanded', 'true');
    if (label) label.textContent = 'Fermer';
    document.body.classList.add('menu-open'); header.classList.add('is-solid'); header.classList.remove('is-hidden');
    if (lenis) lenis.stop();
    if (MOTION) gsap.from($$('.menu-mobile__list li, .menu-mobile__foot > *', menu), { opacity: 0, y: 18, duration: .6, ease: 'power3.out', stagger: .05, clearProps: 'all' });
    const first = $('a', menu); if (first) first.focus();
  };
  const closeMenu = (restore = true) => {
    menu.hidden = true; toggle.setAttribute('aria-expanded', 'false');
    if (label) label.textContent = 'Menu';
    document.body.classList.remove('menu-open'); updateHeader();
    if (lenis) lenis.start();
    if (restore) toggle.focus();
  };
  if (toggle && menu) {
    toggle.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
    document.addEventListener('keydown', (e) => {
      if (menu.hidden) return;
      if (e.key === 'Escape') closeMenu();
      if (e.key === 'Tab') {
        const items = [toggle, ...$$('a, button', menu)];
        const i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    $$('a', menu).forEach((a) => a.addEventListener('click', () => closeMenu(false)));
    matchMedia('(min-width: 1021px)').addEventListener('change', (m) => { if (m.matches && !menu.hidden) closeMenu(false); });
  }

  /* 3. Apparition douce des blocs */
  const reveals = $$('[data-reveal]');
  if (root.classList.contains('motion') && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* 4. Haut de page et ancres internes */
  $$('[data-to-top]').forEach((b) => b.addEventListener('click', () => {
    scrollTo(0, { offset: 0 });
    const skip = $('.skip-link'); if (skip) skip.focus({ preventScroll: true });
  }));

  /* 5. Sujet du formulaire pré-rempli depuis l'URL (?sujet=ceremonie) */
  const sujet = new URLSearchParams(location.search).get('sujet');
  if (sujet) $$('select[name="Sujet"]').forEach((s) => {
    const opt = [...s.options].find((o) => o.dataset.key === sujet);
    if (opt) s.value = opt.value;
  });

  /* 6. Formulaire : envoi réel, confirmation uniquement si succès */
  const MSG = {
    required: 'Veuillez remplir tous les champs obligatoires.',
    sending: 'Envoi en cours…',
    success: 'Votre message a bien été envoyé. Nous vous répondons dans les meilleurs délais.',
    error: "Le message n'a pas pu être envoyé. Réessayez plus tard, ou appelez-nous au 04 68 34 29 27.",
    offline: "Vous semblez hors connexion : le message n'a pas été envoyé. Vérifiez votre connexion puis réessayez.",
  };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  $$('[data-contact-form]').forEach((form) => {
    const status = $('.form-status', form);
    const btn = $('button[type="submit"]', form);
    const btnLabel = $('.btn__label', btn);
    const setStatus = (text, kind) => {
      status.hidden = !text; status.textContent = text || '';
      status.classList.toggle('is-error', kind === 'error');
      status.classList.toggle('is-success', kind === 'success');
    };
    const validate = (input) => {
      let ok = true;
      if (input.type === 'checkbox') ok = !input.required || input.checked;
      else if (input.type === 'email') ok = emailOk(input.value.trim());
      else if (input.required) ok = input.value.trim().length > 0;
      const f = input.closest('.field');
      if (f) { f.classList.toggle('has-error', !ok); const err = $('.field__error', f); if (err) err.hidden = ok; }
      input.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    };
    $$('input[required], textarea[required]', form).forEach((i) => {
      i.addEventListener(i.type === 'checkbox' ? 'change' : 'blur', () => { if (i.getAttribute('aria-invalid')) validate(i); });
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const required = $$('input[required], textarea[required]', form);
      const results = required.map(validate);
      if (results.includes(false)) { setStatus(MSG.required, 'error'); required[results.indexOf(false)].focus(); return; }
      if ($('input[name="_honey"]', form).value) return;
      if (!navigator.onLine) { setStatus(MSG.offline, 'error'); return; }
      const data = {};
      new FormData(form).forEach((v, k) => { data[k] = typeof v === 'string' ? v.trim() : v; });
      data._replyto = data.email;
      btn.disabled = true; btnLabel.textContent = MSG.sending; setStatus('', null);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      let sent = false;
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data), signal: ctrl.signal,
        });
        const json = await res.json().catch(() => ({}));
        sent = res.ok && (json.success === true || json.success === 'true');
      } catch (err) { sent = false; } finally {
        clearTimeout(timer); btn.disabled = false; btnLabel.textContent = 'Envoyer';
      }
      if (sent) {
        form.reset(); $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
        setStatus(MSG.success, 'success');
      } else setStatus(MSG.error, 'error');
    });
  });

  /* 7. Carte Google Maps soumise à consentement */
  const MAP_SRC = 'https://www.google.com/maps?q=9+rue+Maximilien+de+Sully,+66000+Perpignan,+France&z=17&output=embed';
  function loadMap(box) {
    const frame = $('[data-map-frame]', box);
    if (!frame || frame.firstChild) return;
    const iframe = document.createElement('iframe');
    iframe.src = MAP_SRC;
    iframe.title = "Plan d'accès : Maison Créange, 9 rue Maximilien de Sully, Perpignan";
    iframe.loading = 'lazy'; iframe.referrerPolicy = 'no-referrer-when-downgrade'; iframe.allowFullscreen = true;
    frame.appendChild(iframe);
    const revoke = document.createElement('button');
    revoke.type = 'button'; revoke.className = 'map__revoke';
    revoke.textContent = 'Masquer la carte et retirer mon accord';
    revoke.addEventListener('click', () => {
      saveConsent(false);
      const accept = $('[data-map-accept]', box); if (accept) accept.focus();
    });
    frame.appendChild(revoke);
    box.classList.add('is-loaded');
  }
  function unloadMap(box) {
    const frame = $('[data-map-frame]', box);
    if (frame) frame.innerHTML = '';
    box.classList.remove('is-loaded');
  }

  /* 7 bis. Consentement aux cookies (CNIL) : refuser aussi simple qu'accepter, choix gardé 6 mois */
  const CONSENT_KEY = 'mc-consent';
  const CONSENT_TTL = 182 * 864e5;
  const readConsent = () => {
    try { const c = JSON.parse(local.getItem(CONSENT_KEY)); if (c && Date.now() - c.t < CONSENT_TTL) return c; } catch (e) { /* rien */ }
    return null;
  };
  const banner = $('[data-consent]');
  const mapsBox = banner && $('[data-consent-maps]', banner);
  const prefs = banner && $('[data-consent-prefs]', banner);
  const applyConsent = () => {
    const c = readConsent();
    $$('[data-map]').forEach((box) => (c && c.maps ? loadMap(box) : unloadMap(box)));
  };
  const closeBanner = () => { if (banner) banner.hidden = true; };
  const openBanner = (custom = false) => {
    if (!banner) return;
    const c = readConsent();
    if (mapsBox) mapsBox.checked = !!(c && c.maps);
    prefs.hidden = !custom;
    $('[data-consent-save]', banner).hidden = !custom;
    $('[data-consent-custom]', banner).hidden = custom;
    banner.hidden = false;
  };
  function saveConsent(maps) {
    if (local) local.setItem(CONSENT_KEY, JSON.stringify({ maps: !!maps, t: Date.now() }));
    local && local.removeItem('mc-maps');
    closeBanner(); applyConsent();
  }
  if (banner) {
    $('[data-consent-accept]', banner).addEventListener('click', () => saveConsent(true));
    $('[data-consent-refuse]', banner).addEventListener('click', () => saveConsent(false));
    $('[data-consent-save]', banner).addEventListener('click', () => saveConsent(mapsBox && mapsBox.checked));
    $('[data-consent-custom]', banner).addEventListener('click', () => { openBanner(true); if (mapsBox) mapsBox.focus(); });
    $$('[data-consent-open]').forEach((b) => b.addEventListener('click', () => { openBanner(true); if (mapsBox) mapsBox.focus(); }));
    if (!readConsent()) openBanner(false);
  }
  $$('[data-map]').forEach((box) => {
    const accept = $('[data-map-accept]', box);
    if (accept) accept.addEventListener('click', () => saveConsent(true));
  });
  applyConsent();

  /* 7 ter. Horaires : jour en cours mis en avant, ouvert ou fermé en ce moment (heure de Paris) */
  const SLOTS = [[600, 750], [840, 1140]]; /* 10h – 12h30, 14h – 19h, en minutes */
  const hm = (m) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;
  const parisNow = () => {
    const p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = (t) => (p.find((x) => x.type === t) || {}).value;
    const days = { dim: 0, lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6 };
    return { day: days[(g('weekday') || '').slice(0, 3).replace('.', '')], min: parseInt(g('hour'), 10) * 60 + parseInt(g('minute'), 10) };
  };
  const updateHours = () => {
    const { day, min } = parisNow();
    const openDay = day >= 1 && day <= 6;
    const slot = openDay && SLOTS.find(([a, b]) => min >= a && min < b);
    const next = openDay && SLOTS.find(([a]) => min < a);
    let text, cls;
    if (slot) { text = `Ouvert en ce moment, jusqu'à ${hm(slot[1])}`; cls = 'is-open'; }
    else if (next) { text = `Fermé en ce moment, ouvre à ${hm(next[0])}`; cls = 'is-closed'; }
    else { text = `Fermé en ce moment, ouvre ${day === 6 ? 'lundi' : day === 0 ? 'demain' : 'demain'} à 10h`; cls = 'is-closed'; }
    $$('[data-hours-now]').forEach((el) => { el.textContent = text; el.classList.remove('is-open', 'is-closed'); el.classList.add(cls); });
    $$('.hours__table tr').forEach((tr) => tr.classList.toggle('is-today', Number(tr.dataset.day) === day));
  };
  updateHours();
  setInterval(updateHours, 60000);

  /* 7 quater. Collections : la liste pilote l'image */
  $$('[data-colhero]').forEach((hero) => {
    const links = $$('[data-col]', hero);
    const figs = $$('.colhero__stage > .ph', hero);
    let i = 0, timer = null;
    const show = (n) => {
      i = n;
      links.forEach((l, k) => l.classList.toggle('is-active', k === n));
      figs.forEach((f, k) => f.classList.toggle('is-active', k === n));
    };
    const stop = () => { clearInterval(timer); timer = null; };
    links.forEach((l, k) => {
      l.addEventListener('mouseenter', () => { stop(); show(k); });
      l.addEventListener('focus', () => { stop(); show(k); });
    });
    if (root.classList.contains('motion')) timer = setInterval(() => show((i + 1) % figs.length), 3800);
  });

  /* 8. Vidéos : chargées à l'approche, lues seulement à l'écran (en pause si « réduire les animations ») */
  const videos = $$('video[autoplay]');
  let userPaused = false;
  const reduced = !root.classList.contains('motion');
  const play = (v) => { if (userPaused) return; const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const loadSrc = (v) => {
    const lazy = $$('source[data-src]', v);
    if (!lazy.length) return;
    lazy.forEach((s) => { s.src = s.dataset.src; s.removeAttribute('data-src'); });
    v.load();
  };
  if (reduced) { userPaused = true; videos.forEach((v) => { v.removeAttribute('autoplay'); v.pause(); }); }
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { loadSrc(en.target); near.unobserve(en.target); }
    }), { rootMargin: '600px 0px' });
    const vio = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) play(en.target); else en.target.pause();
    }), { threshold: 0.01 });
    videos.forEach((v) => { near.observe(v); vio.observe(v); });
  } else videos.forEach(loadSrc);

  if (!MOTION) return;

  /* ===================== Mouvement ===================== */

  /* Découpe d'un titre en mots masqués, en gardant <em>, <br>… */
  function splitWords(el, cls = 'w') {
    const out = [];
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = cls;
            const inner = document.createElement('span'); inner.textContent = part;
            w.appendChild(inner); frag.appendChild(w); out.push(inner);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    if (!el.hasAttribute('aria-label') && !el.getAttribute('aria-hidden')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    $$('.' + cls, el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
    return out;
  }
  function splitChars(el) {
    const text = el.textContent; el.textContent = '';
    return [...text].map((c) => {
      const w = document.createElement('span'); w.className = 'w';
      const s = document.createElement('span'); s.textContent = c; w.appendChild(s); el.appendChild(w); return s;
    });
  }
  const EASE = 'expo.out';

  /* Voile de transition à l'arrivée (court) */
  const veil = $('[data-veil]');
  if (veil && root.classList.contains('is-arriving')) {
    gsap.fromTo(veil, { scaleY: 1, transformOrigin: '50% 0%' }, {
      scaleY: 0, duration: .5, ease: 'power3.inOut',
      onComplete: () => { root.classList.remove('is-arriving'); gsap.set(veil, { clearProps: 'all' }); },
    });
  }
  root.classList.remove('has-intro');

  /* Entrée de page : pas d'écran d'attente, le contenu arrive tout de suite */
  const heroTl = gsap.timeline({ delay: root.classList.contains('is-arriving') ? .25 : .05 });

  /* Ouverture « C » (accueil, une fois par visite) : le hero attend la fin du monogramme */
  const mono = $('[data-mono]');
  if (mono && root.classList.contains('mono-on')) {
    heroTl.pause();
    let exited = false;
    const finish = () => { mono.remove(); root.classList.remove('mono-on'); };
    const exit = () => { if (exited) return; exited = true; heroTl.play(0); };
    const rings = $$('.mono__ring', mono);
    const tl = gsap.timeline({ onComplete: finish });
    tl.fromTo($('[data-mono-mark]', mono), { scale: .94 }, { scale: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .to(rings, { strokeDashoffset: 0, duration: .9, ease: 'power2.inOut', stagger: .12 }, .1)
      .to($$('.mono__c', mono), { opacity: 1, duration: .6, ease: 'power1.out' }, .32)
      .fromTo($('#mono-shine', mono), { attr: { x1: -1, x2: 0 } }, { attr: { x1: 1.2, x2: 2.2 }, duration: .8, ease: 'power2.inOut' }, .55)
      .fromTo($('.mono__year', mono), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .5, ease: 'power2.out' }, .62)
      .to($('[data-mono-mark]', mono), { opacity: 0, scale: 1.06, duration: .5, ease: 'power2.in' }, 1.75)
      .to(mono, { opacity: 0, duration: .6, ease: 'power2.inOut' }, 1.95)
      .add(exit, 2.0);
    /* Passer d'un geste : toucher, défiler ou touche clavier */
    const skip = () => {
      if (exited) return;
      tl.kill(); exit();
      gsap.to(mono, { opacity: 0, duration: .35, ease: 'power1.out', onComplete: finish });
    };
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, skip, { once: true, passive: true }));
  }

  /* Hero vidéo : logo, titre, puis effet « carte » au défilement */
  const vhero = heroEl;
  if (vhero) {
    const words = splitWords($('[data-split="hero"]', vhero));
    heroTl
      .from($('.vhero__video', vhero), { scale: 1.12, duration: 2.2, ease: 'power3.out' }, 0)
      .from($('.brand', header), { opacity: 0, y: -10, duration: .7, ease: 'power3.out' }, 0)
      .from(words, { yPercent: 110, duration: 1.1, ease: EASE, stagger: .06 }, .15)
      .from($$('[data-hero-in], .site-nav li, .header-cta', document), { opacity: 0, y: 16, duration: .8, ease: 'power3.out', stagger: .05, clearProps: 'opacity,transform' }, .45);

    const frame = $('[data-vhero-frame]', vhero);
    /* Sur téléphone, pas d'effet de cadre : la vidéo reste pleine largeur jusqu'à la section suivante */
    const big = matchMedia('(min-width: 901px)').matches;
    const heroScroll = gsap.timeline({ scrollTrigger: { trigger: vhero, start: 'top top', end: 'bottom top', scrub: true } });
    if (big) heroScroll.fromTo(frame, { clipPath: 'inset(0% 0% 0% 0% round 0px)' }, { clipPath: 'inset(6% 4% 6% 4% round 16px)', ease: 'none' }, 0);
    heroScroll
      .to($('.vhero__video', vhero), { yPercent: 10, ease: 'none' }, 0)
      .to($('[data-vhero-content]', vhero), { yPercent: -30, opacity: 0, ease: 'none' }, 0)
      ;
  }

  /* Hero des pages intérieures */
  const pageHero = $('.hero');
  if (pageHero) {
    const title = $('.hero__title', pageHero);
    if (title) {
      heroTl.from(splitWords(title), { yPercent: 110, duration: 1.1, ease: EASE, stagger: .05 }, .1);
      const rest = $$('.hero__content > :not(.hero__title)', pageHero);
      if (rest.length) heroTl.from(rest, { opacity: 0, y: 16, duration: .8, ease: 'power3.out', stagger: .08 }, .35);
    }
    const media = $('.hero__media > *', pageHero);
    if (media) gsap.to(media, { yPercent: 15, ease: 'none', scrollTrigger: { trigger: pageHero, start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* Titres découpés : seulement les moments forts (data-split), les autres en simple fondu */
  $$('[data-split]:not([data-split="hero"])').forEach((el) => {
    if (el.closest('.hero')) return;
    const parts = el.dataset.split === 'chars' ? splitChars(el) : splitWords(el);
    gsap.from(parts, {
      yPercent: 110, duration: 1.1, ease: EASE, stagger: .05,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  /* Manifeste : les mots s'allument au fil du défilement (un seul endroit du site) */
  $$('[data-scrub-words]').forEach((el) => {
    splitWords(el, 'sw');
    gsap.to($$('.sw', el), {
      opacity: 1, ease: 'none', stagger: .1,
      scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 55%', scrub: true },
    });
  });

  /* Univers : défilement horizontal épinglé (ordinateur), avec barre de progression */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    $$('[data-hscroll]').forEach((sec) => {
      const track = $('[data-hscroll-track]', sec);
      const bar = $('[data-hscroll-progress]', sec);
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tl = gsap.timeline({
        scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist() * 1.5, pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      tl.to(track, { x: () => -dist(), ease: 'none' }, 0);
      if (bar) tl.to(bar, { scaleX: 1, ease: 'none' }, 0);
      /* Profondeur : chaque photo glisse un peu moins vite que sa carte */
      $$('.hcard__media img', sec).forEach((img) => {
        gsap.set(img, { scale: 1.15 });
        tl.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none' }, 0);
      });
    });
  });

  /* Bandes vidéo : parallaxe */
  $$('[data-vband]').forEach((media) => {
    gsap.fromTo(media, { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: media.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* Images : seule la première photo de chaque section se dévoile, les autres suivent le fondu du bloc */
  const seenSections = new Set();
  $$('.ph--filled:not(.ph--bleed), .pic').forEach((fig) => {
    if (fig.closest('[data-hscroll], .hero')) return;
    const sec = fig.closest('section');
    if (!sec || seenSections.has(sec)) return;
    seenSections.add(sec);
    const img = $('img', fig);
    if (!img) return;
    gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 85%', once: true } })
      .fromTo(fig, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .9, ease: 'power3.inOut' })
      .fromTo(img, { scale: 1.15 }, { scale: 1.04, duration: 1.3, ease: 'power3.out' }, 0);
    gsap.fromTo(img, { yPercent: -3 }, {
      yPercent: 3, ease: 'none',
      scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* DA « lumière d'atelier » : la lumière suit la souris, les photos flottent devant le texte */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const lit = $$('.section, .site-footer, .hero--col');
    let px = 0, py = 0, raf = 0;
    const paint = () => {
      raf = 0;
      lit.forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        s.style.setProperty('--mx', `${((px - r.left) / r.width) * 100}%`);
        s.style.setProperty('--my', `${((py - r.top) / r.height) * 100}%`);
      });
    };
    window.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(paint); }, { passive: true });

    /* Profondeur : les médias bougent un peu plus que le texte */
    $$('.split__media, .visit__media, .story__media, .chapter__media').forEach((el) => { if (!el.hasAttribute('data-depth')) el.setAttribute('data-depth', '1'); });
    $$('.split__text, .visit__text, .story__text, .chapter__text > .h2').forEach((el) => { if (!el.hasAttribute('data-depth')) el.setAttribute('data-depth', '-0.4'); });
    const movers = $$('[data-depth]').map((el) => ({
      el, d: parseFloat(el.dataset.depth) || 1,
      x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }),
      y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' }),
    }));
    window.addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      movers.forEach((m) => { m.x(nx * 18 * m.d); m.y(ny * 14 * m.d); });
    }, { passive: true });
  }

  /* Ancres sur la même page, avec le défilement fluide */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download') || /^(mailto|tel):/i.test(a.getAttribute('href'))) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const samePage = url.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '') && url.search === location.search;
    if (samePage) {
      if (!url.hash) return;
      const t = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (t) { e.preventDefault(); scrollTo(t); history.pushState(null, '', url.hash); }
      return;
    }
    /* Transition vers une autre page du site */
    if (!veil) return;
    e.preventDefault();
    if (session) session.setItem('mc-nav', '1');
    gsap.fromTo(veil, { scaleY: 0, transformOrigin: '50% 100%' }, {
      scaleY: 1, duration: .35, ease: 'power2.in',
      onComplete: () => { location.href = url.href; },
    });
  });
  /* Retour arrière depuis le cache du navigateur : enlever le voile */
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && veil) { gsap.set(veil, { clearProps: 'all' }); root.classList.remove('is-arriving'); }
  });

  /* Arrivée sur une ancre (#formulaire) : positionner après la mise en page */
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
    if (location.hash) {
      const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t) scrollTo(t, { immediate: true });
    }
  });
})();
