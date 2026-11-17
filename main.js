(function () {
  "use strict";

  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var escHTML = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); }
  }

  /* ---------------------------------------------------------
     Nav: sticky solidify + active link + mobile menu
  --------------------------------------------------------- */
  function initNav() {
    var nav = $(".nav");
    if (!nav) return;
    var onScroll = function () {
      if (scrollY > 40) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var path = document.body.getAttribute("data-nav") || (location.pathname.split("/").pop() || "index.html");
    $$(".nav-link, .nav-mobile-link").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === path || (path === "" && href === "index.html")) a.classList.add("is-active");
    });

    var toggle = $(".nav-toggle");
    var mobile = $(".nav-mobile");
    if (toggle && mobile) {
      var close = function () {
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        mobile.setAttribute("data-open", "false");
        document.documentElement.style.overflow = "";
      };
      var open = function () {
        toggle.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        mobile.setAttribute("data-open", "true");
        document.documentElement.style.overflow = "hidden";
      };
      toggle.addEventListener("click", function () {
        if (toggle.classList.contains("is-open")) close(); else open();
      });
      $$("a", mobile).forEach(function (a) { a.addEventListener("click", close); });
    }
  }

  /* ---------------------------------------------------------
     Smooth anchor scrolling (native)
  --------------------------------------------------------- */
  function initSmoothAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var navH = 84;
      window.scrollTo({
        top: el.getBoundingClientRect().top + scrollY - navH,
        behavior: reduced ? "auto" : "smooth"
      });
    });
  }

  /* ---------------------------------------------------------
     Scroll progress bar
  --------------------------------------------------------- */
  function initScrollProgress() {
    var bar = $("[data-scroll-progress]");
    if (!bar) return;
    var raf = null;
    var update = function () {
      var max = document.documentElement.scrollHeight - innerHeight;
      var pct = max > 0 ? scrollY / max : 0;
      bar.style.transform = "scaleX(" + pct + ")";
      raf = null;
    };
    window.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
  }

  /* ---------------------------------------------------------
     Hero mesh + network: mouse-reactive on desktop, drifts via CSS otherwise
  --------------------------------------------------------- */
  function initHeroMesh() {
    var mesh = $(".hero-mesh");
    if (!mesh || !fineHover) return;
    mesh.classList.add("is-manual");
    var tx = 30, ty = 20, mx = 30, my = 20;
    var hero = $(".hero");
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 60 + 10;
      ty = ((e.clientY - r.top) / r.height) * 50 + 8;
    });
    function loop() {
      mx += (tx - mx) * 0.05;
      my += (ty - my) * 0.05;
      mesh.style.setProperty("--mesh-x", mx + "%");
      mesh.style.setProperty("--mesh-y", my + "%");
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ---------------------------------------------------------
     Reveal on scroll
  --------------------------------------------------------- */
  function initReveals() {
    var els = $$("[data-reveal]");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-revealed");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    els.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      $$("[data-reveal]:not(.is-revealed)").forEach(function (el) {
        if (el.getBoundingClientRect().top < innerHeight) el.classList.add("is-revealed");
      });
    }, 6000);
  }

  /* ---------------------------------------------------------
     Split text (words) — preserves <br> and <em>
  --------------------------------------------------------- */
  function splitWords(el) {
    el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
    var wrap = function (text) {
      return text.split(/(\s+)/).map(function (w) {
        return /^\s+$/.test(w) ? w : '<span class="split-word" aria-hidden="true">' + escHTML(w) + "</span>";
      }).join("");
    };
    var html = Array.prototype.map.call(el.childNodes, function (node) {
      if (node.nodeType === 3) return wrap(node.textContent);
      if (node.nodeName === "BR") return "<br>";
      if (node.nodeType === 1) {
        var tag = node.tagName.toLowerCase();
        return "<" + tag + ">" + wrap(node.textContent) + "</" + tag + ">";
      }
      return "";
    }).join("");
    el.innerHTML = html;
    return $$(".split-word", el);
  }

  function initSplitText() {
    var targets = $$("[data-split]");
    if (!targets.length) return;
    targets.forEach(function (el, idx) {
      if (el.classList.contains("reveal")) el.classList.remove("reveal");
      var parts = splitWords(el);
      if (window.gsap && window.ScrollTrigger) {
        gsap.set(parts, { y: 22, opacity: 0 });
        el.classList.add("is-split");
        gsap.to(parts, {
          y: 0, opacity: 1, duration: 0.85, stagger: 0.035, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true }
        });
      } else {
        parts.forEach(function (p) { p.style.opacity = 1; });
        el.classList.add("is-split");
      }
    });
  }

  /* ---------------------------------------------------------
     Magnetic buttons
  --------------------------------------------------------- */
  function initMagnetic() {
    if (!fineHover) return;
    $$("[data-magnetic]").forEach(function (el) {
      var strength = parseFloat(el.dataset.magneticStrength || "0.25");
      var inner = document.createElement("span");
      inner.className = "magnetic-inner";
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
      el.classList.add("has-magnetic");
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) - r.width / 2) * strength;
        ty = ((e.clientY - r.top) - r.height / 2) * strength;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      el.addEventListener("mouseleave", function () {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
      function loop() {
        cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
        inner.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
        raf = (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) ? requestAnimationFrame(loop) : null;
      }
    });
  }

  /* ---------------------------------------------------------
     Count-up numbers
  --------------------------------------------------------- */
  function initCountUp() {
    $$("[data-count-to]").forEach(function (el) {
      var target = parseFloat(el.dataset.countTo);
      var obj = { v: 0 };
      if (window.gsap) el.textContent = "0";
      el.classList.add("is-ready");
      var trigger = function () {
        if (window.gsap) {
          gsap.to(obj, {
            v: target, duration: 1.5, ease: "power2.out",
            onUpdate: function () { el.textContent = Math.round(obj.v); }
          });
        } else {
          el.textContent = target;
        }
      };
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { trigger(); io.unobserve(e.target); } });
      }, { threshold: 0.05 });
      io.observe(el);
    });
  }

  /* ---------------------------------------------------------
     Testimonials video grid — facade lazy-load
     (cards are hardcoded in HTML so content shows without JS;
     this only wires up the click-to-play behavior)
  --------------------------------------------------------- */

  function initVideoFacade() {
    $$(".video-card").forEach(function (card) {
      if (card.dataset.videoBound) return;
      card.dataset.videoBound = "1";
      card.addEventListener("click", function () {
        var id = card.dataset.videoId;
        if (!id || card.querySelector("iframe")) return;
        var iframe = document.createElement("iframe");
        iframe.src = "https://www.youtube.com/embed/" + id + "?autoplay=1&rel=0";
        iframe.title = "Reproductor de video de testimonio";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        card.appendChild(iframe);
      });
    });
  }

  /* ---------------------------------------------------------
     Títulos con máscara (sube palabra por palabra)
  --------------------------------------------------------- */
  function wrapMaskWords(node, out) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(" ")); return; }
          var outer = document.createElement("span"); outer.className = "mask-word";
          var inner = document.createElement("span"); inner.textContent = w;
          outer.appendChild(inner); frag.appendChild(outer); out.push(inner);
        });
        n.parentNode.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.nodeName !== "BR") wrapMaskWords(n, out);
    });
  }
  function initMask() {
    var els = $$("[data-mask]");
    if (!window.gsap || !window.ScrollTrigger || reduced) {
      els.forEach(function (el) { el.classList.add("is-split"); });
      return;
    }
    els.forEach(function (el) {
      var label = el.textContent.trim().replace(/\s+/g, " ");
      var words = [];
      wrapMaskWords(el, words);
      el.setAttribute("aria-label", label);
      words.forEach(function (w) { w.setAttribute("aria-hidden", "true"); });
      gsap.set(words, { yPercent: 115 });
      el.classList.add("is-split");
      ScrollTrigger.create({
        trigger: el, start: "top 92%", once: true,
        onEnter: function () { gsap.to(words, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.07 }); }
      });
    });
  }

  /* ---------------------------------------------------------
     Hero: piezas de producto (entrada, flote y parallax al cursor)
  --------------------------------------------------------- */
  function initHeroStage() {
    var stage = $(".hero-stage");
    if (!stage) return;
    var cards = $$(".float-card", stage);
    var glow = $(".stage-glow", stage);
    if (!window.gsap || !window.ScrollTrigger || reduced) {
      $$(".fc-in", stage).forEach(function (e) { e.style.opacity = 1; });
      if (glow) glow.style.opacity = 0.4;
      return;
    }
    if (getComputedStyle(stage).display === "none") return;
    var floats = [];
    gsap.fromTo(glow, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 0.4, duration: 1.6, ease: "power2.out" });
    cards.forEach(function (card, i) {
      var inner = $(".fc-in", card);
      gsap.fromTo(inner, { opacity: 0, y: 46, scale: 0.97 }, {
        opacity: 1, y: 0, scale: 1, duration: 1.1, ease: "power3.out", delay: 0.35 + i * 0.16,
        onComplete: function () {
          floats.push(gsap.to(inner, { y: -9, duration: 3.4 + i * 0.5, ease: "sine.inOut", yoyo: true, repeat: -1 }));
        }
      });
    });
    gsap.to(glow, { opacity: 0.28, duration: 4.2, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 2 });
    var hero = stage.closest(".hero");
    if (fineHover && hero) {
      var movers = cards.map(function (c) {
        return { x: gsap.quickTo(c, "x", { duration: 0.9, ease: "power3.out" }), y: gsap.quickTo(c, "y", { duration: 0.9, ease: "power3.out" }), d: parseFloat(c.dataset.depth || 1) };
      });
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        movers.forEach(function (m) { m.x(-nx * 26 * m.d); m.y(-ny * 18 * m.d); });
      });
      hero.addEventListener("pointerleave", function () { movers.forEach(function (m) { m.x(0); m.y(0); }); });
    }
    ScrollTrigger.create({
      trigger: hero, start: "top bottom", end: "bottom top",
      onToggle: function (s) { floats.forEach(function (t) { if (s.isActive) t.resume(); else t.pause(); }); }
    });
  }

  /* ---------------------------------------------------------
     Tarjetas: luz que sigue al cursor + íconos que se dibujan
  --------------------------------------------------------- */
  function initSpotlight() {
    $$(".services-grid .card, .include-grid .card, .pillars-grid .card").forEach(function (card) {
      card.classList.add("has-spotlight");
      $$(".icon-tile svg *", card).forEach(function (el) { if (el.setAttribute) el.setAttribute("pathLength", "1"); });
      if (!fineHover) return;
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------------------------------------------------------
     Metodología: red que se construye con el scroll
  --------------------------------------------------------- */
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function buildNet(svg) {
    var NS = "http://www.w3.org/2000/svg", rnd = mulberry(11), cx = 300, cy = 300;
    var rings = [{ n: 4, r: [0, 55] }, { n: 8, r: [105, 145] }, { n: 9, r: [185, 225] }, { n: 8, r: [255, 285] }];
    var nodes = [];
    rings.forEach(function (d, g) {
      for (var i = 0; i < d.n; i++) {
        var a = (i / d.n) * Math.PI * 2 + rnd() * 0.5 + g * 0.45, r = d.r[0] + (d.r[1] - d.r[0]) * rnd();
        nodes.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, g: g });
      }
    });
    var seen = {}, edges = [];
    nodes.forEach(function (n, i) {
      var near = nodes.map(function (m, j) { return { j: j, d: (m.x - n.x) * (m.x - n.x) + (m.y - n.y) * (m.y - n.y), g: m.g }; })
        .filter(function (o) { return o.j !== i && o.g <= n.g; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 2);
      near.forEach(function (o) { var k = Math.min(i, o.j) + "-" + Math.max(i, o.j); if (!seen[k]) { seen[k] = 1; edges.push({ a: i, b: o.j, g: Math.max(n.g, nodes[o.j].g) }); } });
    });
    var lineEls = [], nodeEls = [];
    edges.forEach(function (e) {
      var A = nodes[e.a], B = nodes[e.b], l = document.createElementNS(NS, "line");
      l.setAttribute("x1", A.x); l.setAttribute("y1", A.y); l.setAttribute("x2", B.x); l.setAttribute("y2", B.y);
      l.setAttribute("class", "pn-line" + (e.g === 3 && ((e.a + e.b) % 4 === 0) ? " is-orange" : ""));
      l.dataset.g = e.g; svg.appendChild(l); lineEls.push(l);
    });
    nodes.forEach(function (n, i) {
      var c = document.createElementNS(NS, "circle"); c.setAttribute("cx", n.x); c.setAttribute("cy", n.y);
      c.setAttribute("r", n.g === 0 ? 8 : 4.5 + (i % 3));
      c.setAttribute("class", "pn-node" + (n.g === 0 ? " is-core" : "") + (n.g === 3 && i % 3 === 0 ? " is-orange" : ""));
      c.dataset.g = n.g; svg.appendChild(c); nodeEls.push(c);
    });
    return { lines: lineEls, nodes: nodeEls };
  }
  function initStory() {
    var svg = $(".story-net");
    if (!svg) return;
    var net = buildNet(svg);
    net.lines.forEach(function (l) { var len = l.getTotalLength(); l.style.strokeDasharray = len; l.style.strokeDashoffset = 0; l.dataset.len = len; });
    var steps = $$(".story-step");
    if (!window.gsap || !window.ScrollTrigger) { steps.forEach(function (s) { s.classList.add("is-active"); }); return; }
    steps.forEach(function (s) {
      ScrollTrigger.create({ trigger: s, start: "top 62%", end: "bottom 62%", onToggle: function (self) { s.classList.toggle("is-active", self.isActive); } });
    });
    if (reduced) { steps.forEach(function (s) { s.classList.add("is-active"); }); gsap.set(".story-line-fill", { scaleY: 1 }); return; }
    var mm = gsap.matchMedia();
    mm.add("(min-width: 960px)", function () {
      gsap.set(net.nodes, { opacity: 0, scale: 0, transformOrigin: "50% 50%", transformBox: "fill-box" });
      net.lines.forEach(function (l) { l.style.strokeDashoffset = l.dataset.len; });
      var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      for (var g = 0; g < 4; g++) {
        var ns = net.nodes.filter(function (n) { return +n.dataset.g === g; });
        var ls = net.lines.filter(function (l) { return +l.dataset.g === g; });
        tl.to(ns, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.07 }, g);
        tl.to(ls, { strokeDashoffset: 0, duration: 0.9, stagger: 0.05, ease: "power2.out" }, g + 0.2);
      }
      ScrollTrigger.create({ trigger: ".story-steps", start: "top 66%", end: "bottom 74%", scrub: 0.8, animation: tl });
      gsap.to(".story-line-fill", { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".story-steps", start: "top 62%", end: "bottom 62%", scrub: 0.6 } });
    });
    mm.add("(max-width: 959px)", function () {
      gsap.set(".story-line-fill", { scaleY: 1 });
      gsap.fromTo(net.nodes, { opacity: 0, scale: 0, transformOrigin: "50% 50%", transformBox: "fill-box" }, { opacity: 1, scale: 1, duration: 0.7, stagger: 0.03, ease: "power3.out", scrollTrigger: { trigger: svg, start: "top 80%", once: true } });
    });
  }

  /* ---------------------------------------------------------
     CTA final: glow ambiente
  --------------------------------------------------------- */
  function initBloom() {
    $$(".cta-bloom").forEach(function (g) {
      if (!window.gsap || !window.ScrollTrigger || reduced) { g.style.opacity = 0.4; return; }
      gsap.fromTo(g, { opacity: 0, scale: 0.8 }, {
        opacity: 0.4, scale: 1, duration: 1.8, ease: "power2.out",
        scrollTrigger: { trigger: g.parentNode, start: "top 75%", once: true },
        onComplete: function () { gsap.to(g, { opacity: 0.3, scale: 1.04, duration: 4, ease: "sine.inOut", yoyo: true, repeat: -1 }); }
      });
    });
  }

  /* ---------------------------------------------------------
     Barra de WhatsApp (móvil) y carrusel de testimonios
  --------------------------------------------------------- */
  function initWaBar() {
    var bar = $(".wa-bar");
    if (!bar) return;
    var on = function () { bar.classList.toggle("is-visible", scrollY > 420); };
    on();
    window.addEventListener("scroll", on, { passive: true });
  }
  function initCarousel() {
    $$("[data-carousel]").forEach(function (wrap) {
      var track = $(".carousel", wrap), prev = $("[data-dir='-1']", wrap), next = $("[data-dir='1']", wrap);
      if (!track || !prev || !next) return;
      var step = function () { var c = track.firstElementChild; return c ? c.getBoundingClientRect().width + 18 : 300; };
      var update = function () {
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
      };
      prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: reduced ? "auto" : "smooth" }); });
      next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: reduced ? "auto" : "smooth" }); });
      track.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      update();
    });
  }

  /* ---------------------------------------------------------
     WebMCP: expose key site actions as tools for in-browser agents
  --------------------------------------------------------- */
  function initWebMCP() {
    var mc = document.modelContext || navigator.modelContext;
    if (!mc || typeof mc.registerTool !== "function") return;

    var SERVICES = {
      "desarrollo-software": { url: "desarrollo-software.html", name: "Desarrollo de aplicaciones y software a medida", items: ["ERP básicos", "Software de gestión de tareas", "Portales de clientes", "Soluciones a medida"] },
      "diseno-desarrollo-web": { url: "desarrollo-web.html", name: "Diseño y desarrollo web", items: ["Landing pages", "Páginas web", "E-commerce", "Posicionamiento SEO", "Emails institucionales", "Google Workspace", "Hosting", "Mantenimiento y soporte"] },
      "erp": { url: "gestion-erp.html", name: "Personalización y gestión de productos en ERP", items: ["Carga y actualización de productos", "Incorporación y optimización de imágenes", "Redacción y carga de descripciones", "Organización por categorías y rubros", "Configuración de etiquetas y atributos", "Clasificación y estructuración del catálogo", "Normalización de la información de productos", "Adaptación de datos para e-commerce y canales digitales", "Configuración de campos específicos según el ERP", "Revisión y control de la información cargada"] },
      "marketing-digital": { url: "marketing-digital.html", name: "Marketing digital", items: ["Manejo de redes sociales", "Diseño de gráficas y videos", "Generación de leads automatizando LinkedIn"] },
      "diseno-grafico": { url: "diseno-grafico.html", name: "Diseño gráfico", items: ["Brochures", "Catálogos", "Tarjetas personales", "Diseño editorial"] }
    };
    var PAGES = { inicio: "index.html", nosotros: "nosotros.html", servicios: "servicios.html", testimonios: "testimonios.html", contacto: "contacto.html" };
    var text = function (obj) { return { content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj) }] }; };

    var tools = [
      {
        name: "listar_servicios",
        description: "Lista los servicios de Wargo Studio (agencia de transformación digital) con sus prestaciones. Sin parámetros devuelve las cinco áreas.",
        inputSchema: {
          type: "object",
          properties: { area: { type: "string", enum: Object.keys(SERVICES), description: "Área opcional para ver solo una." } }
        },
        execute: function (args) {
          var area = args && args.area;
          if (area && SERVICES[area]) return text(SERVICES[area]);
          return text(SERVICES);
        }
      },
      {
        name: "obtener_contacto",
        description: "Devuelve los datos de contacto de Wargo Studio: WhatsApp (con mensaje inicial opcional), email y teléfono.",
        inputSchema: {
          type: "object",
          properties: { mensaje: { type: "string", description: "Mensaje inicial opcional para el enlace de WhatsApp." } }
        },
        execute: function (args) {
          var msg = (args && args.mensaje) || "Hola! Te escribo desde la página web de Wargo. Necesito...";
          return text({
            whatsapp: "https://wa.me/5493518193172?text=" + encodeURIComponent(msg),
            email: "info@wargostudio.com",
            telefono: "+54 9 3518 19-3172"
          });
        }
      },
      {
        name: "ir_a_pagina",
        description: "Navega a una página del sitio de Wargo Studio.",
        inputSchema: {
          type: "object",
          properties: { pagina: { type: "string", enum: Object.keys(PAGES), description: "Página de destino." } },
          required: ["pagina"]
        },
        execute: function (args) {
          var target = args && PAGES[args.pagina];
          if (!target) return text("Página no válida. Opciones: " + Object.keys(PAGES).join(", "));
          location.href = target;
          return text("Navegando a " + target);
        }
      }
    ];

    tools.forEach(function (tool) {
      try {
        var res = mc.registerTool(tool);
        if (res && typeof res.catch === "function") res.catch(function (e) { console.warn("[WebMCP]", tool.name, e); });
      } catch (e) {
        console.warn("[WebMCP]", tool.name, e);
      }
    });
  }

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  function boot() {
    if (window.gsap && window.ScrollTrigger) { try { gsap.registerPlugin(ScrollTrigger); } catch (_e) {} }
    safe(initNav, "initNav");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initScrollProgress, "initScrollProgress");
    safe(initHeroMesh, "initHeroMesh");
    safe(initReveals, "initReveals");
    safe(initMagnetic, "initMagnetic");
    safe(initCountUp, "initCountUp");
    safe(initVideoFacade, "initVideoFacade");
    safe(initWebMCP, "initWebMCP");
    safe(initMask, "initMask");
    safe(initSpotlight, "initSpotlight");
    safe(initCarousel, "initCarousel");
    safe(initWaBar, "initWaBar");

    if (window.gsap && window.ScrollTrigger) {
      safe(initSplitText, "initSplitText");
      safe(initHeroStage, "initHeroStage");
      safe(initStory, "initStory");
      safe(initBloom, "initBloom");
    }

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
