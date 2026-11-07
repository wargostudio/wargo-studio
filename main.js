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

    var path = (location.pathname.split("/").pop() || "index.html");
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
        gsap.to(parts, {
          y: 0, opacity: 1, duration: 0.85, stagger: 0.035, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true }
        });
      } else {
        parts.forEach(function (p) { p.style.opacity = 1; });
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
     WebMCP: expose key site actions as tools for in-browser agents
  --------------------------------------------------------- */
  function initWebMCP() {
    var mc = document.modelContext || navigator.modelContext;
    if (!mc || typeof mc.registerTool !== "function") return;

    var SERVICES = {
      "desarrollo-software": { name: "Desarrollo de aplicaciones y software a medida", items: ["ERP básicos", "Software de gestión de tareas", "Portales de clientes", "Soluciones a medida"] },
      "diseno-desarrollo-web": { name: "Diseño y desarrollo web", items: ["Landing pages", "Páginas web", "E-commerce", "Posicionamiento SEO", "Emails institucionales", "Google Workspace", "Hosting", "Mantenimiento y soporte"] },
      "erp": { name: "Personalización y gestión de productos en ERP", items: ["Carga y actualización de productos", "Incorporación y optimización de imágenes", "Redacción y carga de descripciones", "Organización por categorías y rubros", "Configuración de etiquetas y atributos", "Clasificación y estructuración del catálogo", "Normalización de la información de productos", "Adaptación de datos para e-commerce y canales digitales", "Configuración de campos específicos según el ERP", "Revisión y control de la información cargada"] },
      "marketing-digital": { name: "Marketing digital", items: ["Manejo de redes sociales", "Diseño de gráficas y videos", "Generación de leads automatizando LinkedIn"] },
      "diseno-grafico": { name: "Diseño gráfico", items: ["Brochures", "Catálogos", "Tarjetas personales", "Diseño editorial"] }
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
    safe(initNav, "initNav");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initScrollProgress, "initScrollProgress");
    safe(initHeroMesh, "initHeroMesh");
    safe(initReveals, "initReveals");
    safe(initMagnetic, "initMagnetic");
    safe(initCountUp, "initCountUp");
    safe(initVideoFacade, "initVideoFacade");
    safe(initWebMCP, "initWebMCP");

    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_e) {}
      safe(initSplitText, "initSplitText");
    }

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
