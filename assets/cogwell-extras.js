/*
  Cogwell site extras: analytics + conversion events, mobile call/WhatsApp bar.
  Edit the CONFIG block only.
*/
(function () {
  "use strict";

  var CONFIG = {
    // GA4 measurement ID (Admin > Data streams in Google Analytics)
    gaId: "G-WPCNTQ91WB",
    // WhatsApp number, international format without "+"
    whatsapp: "27774027640",
    // Call number
    tel: "+27621109631",
    // Paste payment links (PayFast, Yoco, Paystack, etc.) to show a "Pay now"
    // button after someone requests a diagnostic. Leave "" to hide the button.
    payLinks: { light: "", hands: "" },
    // true  = Google Analytics loads for everyone but sets no cookies until the
    //         visitor clicks Accept (Google Consent Mode).
    // false = Google Analytics only loads after the visitor clicks Accept.
    loadAnalyticsBeforeConsent: true
  };
  window.COGWELL = CONFIG;

  // Offline / file:// support: when the site is opened straight from a folder
  // (no web server), root-absolute links like "/services" cannot resolve.
  // Point them at the matching folder's index.html instead.
  if (location.protocol === "file:") {
    var cs = document.currentScript;
    var root = cs && cs.src ? cs.src.replace(/assets\/[^\/]*$/, "") : "";
    var fixLinks = function () {
      var list = document.querySelectorAll('a[href^="/"]:not([href^="//"])');
      for (var i = 0; i < list.length; i++) {
        var h = list[i].getAttribute("href");
        var m = h.match(/^\/([^?#]*)([?#].*)?$/);
        var path = m[1].replace(/\/$/, "");
        list[i].setAttribute("href", root + (path ? path + "/" : "") + "index.html" + (m[2] || ""));
      }
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fixLinks);
    else fixLinks();
  }

  var CONSENT_KEY = "cogwell-cookie-consent";
  var started = false;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  var stored = null;
  try {
    stored = localStorage.getItem(CONSENT_KEY);
  } catch (e) {}
  var granted = stored === "accepted";

  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: granted ? "granted" : "denied",
    wait_for_update: 500
  });

  function startGA() {
    if (started || !CONFIG.gaId) return;
    started = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CONFIG.gaId);
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", CONFIG.gaId, { allow_google_signals: false, allow_ad_personalization_signals: false });
  }

  if (CONFIG.loadAnalyticsBeforeConsent || granted) startGA();

  // Called by the cookie banner (Accept button).
  window.cwConsent = function (ok) {
    gtag("consent", "update", { analytics_storage: ok ? "granted" : "denied" });
    if (ok) startGA();
  };

  function track(name, params) {
    try {
      var p = params || {};
      p.transport_type = "beacon";
      gtag("event", name, p);
    } catch (e) {}
  }
  window.cwTrack = track;

  function where(el) {
    if (el.closest("#cw-mobile-bar")) return "mobile_bar";
    if (el.closest("header")) return "header";
    if (el.closest("footer")) return "footer";
    return "page";
  }

  document.addEventListener(
    "click",
    function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var a = t.closest("a[href]");
      if (!a) return;
      var h = a.getAttribute("href") || "";
      var loc = where(a);
      if (/^tel:/i.test(h)) {
        track("phone_click", { link_location: loc, page_path: location.pathname });
      } else if (/wa\.me|api\.whatsapp\.com|^whatsapp:/i.test(h)) {
        track("whatsapp_click", { link_location: loc, page_path: location.pathname });
      } else if (/^mailto:/i.test(h)) {
        track("email_click", { link_location: loc, page_path: location.pathname });
      } else if (h.indexOf("/diagnostic") === 0 || h.indexOf("#start-diagnostic") === 0) {
        track("cta_click", {
          destination: h,
          link_location: loc,
          link_text: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
          page_path: location.pathname
        });
      }
    },
    true
  );

  // Calculator: fire once per page when someone first uses it.
  var calcPath = null;
  function calcUsed(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var hit =
      (t.id && /^calc-/.test(t.id)) ||
      (t.closest("button[aria-pressed]") && document.getElementById("calc-total-calls"));
    if (!hit) return;
    if (calcPath === location.pathname) return;
    calcPath = location.pathname;
    track("calculator_use", { page_path: location.pathname });
  }
  document.addEventListener("input", calcUsed, true);
  document.addEventListener("click", calcUsed, true);

  // Sticky call / WhatsApp bar on phones.
  function mountBar() {
    if (document.getElementById("cw-mobile-bar") || !document.body) return;
    var css = document.createElement("style");
    css.textContent =
      "#cw-mobile-bar{display:none}" +
      "@media(max-width:639px){" +
      "#cw-mobile-bar{display:flex;gap:8px;position:fixed;left:0;right:0;bottom:0;z-index:40;" +
      "padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));" +
      "background:var(--card,#fff);border-top:1px solid var(--border,#ddd)}" +
      "#cw-mobile-bar a{flex:1;text-align:center;border-radius:9999px;padding:12px 8px;" +
      "font-size:14px;font-weight:600;text-decoration:none;line-height:1.2}" +
      "#cw-mobile-bar a.cw-call{border:1px solid var(--border,#ddd);color:var(--foreground,#111)}" +
      "#cw-mobile-bar a.cw-wa{background:var(--accent,#9be22b);color:var(--accent-foreground,#0b2a1c)}" +
      "body{padding-bottom:calc(70px + env(safe-area-inset-bottom,0px))}" +
      "}";
    document.head.appendChild(css);

    var bar = document.createElement("div");
    bar.id = "cw-mobile-bar";
    bar.setAttribute("role", "navigation");
    bar.setAttribute("aria-label", "Contact");
    var msg = "Hi Cogwell! I'd like to find out where my business is losing revenue and how AI automation can help. Can we chat?";
    bar.innerHTML =
      '<a class="cw-call" href="tel:' + CONFIG.tel + '">Call</a>' +
      '<a class="cw-wa" target="_blank" rel="noreferrer" href="https://wa.me/' +
      CONFIG.whatsapp + "?text=" + encodeURIComponent(msg) + '">WhatsApp</a>';
    document.body.appendChild(bar);

    // Sit above the cookie banner while it is showing.
    var raf = 0;
    function adjust() {
      raf = 0;
      var b = document.querySelector("div.fixed.inset-x-0.bottom-0.z-50");
      bar.style.bottom = b ? b.offsetHeight + "px" : "0px";
    }
    function schedule() {
      if (!raf) raf = requestAnimationFrame(adjust);
    }
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    adjust();
  }

  // Wait until the page has finished loading (and the app has taken over) before
  // adding anything to the page.
  function whenReady() {
    setTimeout(mountBar, 400);
  }
  if (document.readyState === "complete") whenReady();
  else window.addEventListener("load", whenReady);
})();
