// Theme toggle (remembers choice per browser)
(function () {
  var root = document.documentElement;
  try { var saved = localStorage.getItem("theme"); if (saved) root.setAttribute("data-theme", saved); } catch (e) {}
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("theme-btn");
    if (btn) {
      var isDark = function () {
        var t = root.getAttribute("data-theme");
        return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      };
      var label = function () { btn.textContent = isDark() ? "Light mode" : "Dark mode"; };
      label();
      btn.addEventListener("click", function () {
        var next = isDark() ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) {}
        label();
      });
    }

    // BibTeX toggles
    document.querySelectorAll("[data-bib]").forEach(function (b) {
      b.addEventListener("click", function () {
        var el = document.getElementById(b.getAttribute("data-bib"));
        if (el) { el.classList.toggle("open"); b.setAttribute("aria-expanded", el.classList.contains("open")); }
      });
    });

    // Highlight current section in sidebar
    var links = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
    if (links.length && "IntersectionObserver" in window) {
      var map = {};
      links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            links.forEach(function (a) { a.classList.remove("active"); });
            var a = map[en.target.id]; if (a) a.classList.add("active");
          }
        });
      }, { rootMargin: "-20% 0px -70% 0px" });
      Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) obs.observe(s); });
    }

    var y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();
  });
})();
