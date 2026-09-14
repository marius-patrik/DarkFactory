/*
 * Omnis documentation theme behaviour.
 *
 * Three small things, no dependencies: the colour-scheme toggle, the mobile navigation, and search
 * over the index the search plugin already emits. Search is a scored substring match rather than a
 * bundled index library — the corpus here is a few dozen pages, and a full-text engine would be more
 * bytes than the documents it searches.
 */

(function () {
  "use strict";

  var root = document.documentElement;

  /* ── Colour scheme ──────────────────────────────────────────────────── */

  var toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("docs-theme", next);
      } catch (e) {
        /* Private browsing: the choice simply does not persist. */
      }
    });
  }

  /* ── Mobile navigation ──────────────────────────────────────────────── */

  var navToggle = document.querySelector("[data-nav-toggle]");
  var sidebar = document.querySelector("[data-nav]");
  if (navToggle && sidebar) {
    navToggle.addEventListener("click", function () {
      sidebar.classList.toggle("is-open");
    });
    sidebar.addEventListener("click", function (event) {
      if (event.target.closest("a")) sidebar.classList.remove("is-open");
    });
  }

  /* ── Table of contents highlighting ─────────────────────────────────── */

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc__list a"));
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    tocLinks.forEach(function (link) {
      var id = decodeURIComponent(link.getAttribute("href") || "").replace(/^#/, "");
      if (id) byId[id] = link;
    });

    var visible = new Set();
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });
        var first = tocLinks.find(function (link) {
          var id = decodeURIComponent(link.getAttribute("href") || "").replace(/^#/, "");
          return visible.has(id);
        });
        tocLinks.forEach(function (link) {
          link.classList.toggle("is-active", link === first);
        });
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );

    Object.keys(byId).forEach(function (id) {
      var heading = document.getElementById(id);
      if (heading) observer.observe(heading);
    });
  }

  /* ── Search ─────────────────────────────────────────────────────────── */

  var input = document.getElementById("search-input");
  var panel = document.getElementById("search-results");
  if (!input || !panel) return;

  var baseEl = document.getElementById("search-base");
  var base = "";
  try {
    base = JSON.parse(baseEl.textContent) || "";
  } catch (e) {
    base = "";
  }
  if (base && base.slice(-1) !== "/") base += "/";

  var docs = null;
  var loading = false;
  var activeIndex = -1;

  function load() {
    if (docs || loading) return Promise.resolve();
    loading = true;
    return fetch(base + "search/search_index.json")
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        docs = (data && data.docs) || [];
      })
      .catch(function () {
        docs = [];
      })
      .finally(function () {
        loading = false;
      });
  }

  function score(doc, needle) {
    var title = (doc.title || "").toLowerCase();
    var text = (doc.text || "").toLowerCase();
    if (title === needle) return 100;
    if (title.indexOf(needle) === 0) return 80;
    if (title.indexOf(needle) !== -1) return 60;
    var at = text.indexOf(needle);
    if (at !== -1) return 30 - Math.min(20, Math.floor(at / 200));
    return 0;
  }

  function excerpt(doc, needle) {
    var text = doc.text || "";
    var at = text.toLowerCase().indexOf(needle);
    if (at === -1) return text.slice(0, 140);
    var from = Math.max(0, at - 50);
    return (from > 0 ? "…" : "") + text.slice(from, from + 150);
  }

  function render(results) {
    activeIndex = -1;
    if (!results.length) {
      panel.innerHTML = '<div class="search-results__empty">No matches</div>';
      panel.hidden = false;
      return;
    }
    panel.innerHTML = results
      .map(function (doc) {
        return (
          '<a href="' +
          base +
          doc.location +
          '"><span class="search-results__title"></span>' +
          '<span class="search-results__text"></span></a>'
        );
      })
      .join("");
    // Assign text via textContent so document content can never inject markup.
    Array.prototype.forEach.call(panel.children, function (anchor, i) {
      anchor.children[0].textContent = results[i].title || results[i].location;
      anchor.children[1].textContent = results[i].excerpt;
    });
    panel.hidden = false;
  }

  function search() {
    var needle = input.value.trim().toLowerCase();
    if (needle.length < 2) {
      panel.hidden = true;
      return;
    }
    load().then(function () {
      var results = (docs || [])
        .map(function (doc) {
          return { doc: doc, rank: score(doc, needle) };
        })
        .filter(function (entry) {
          return entry.rank > 0;
        })
        .sort(function (a, b) {
          return b.rank - a.rank;
        })
        .slice(0, 8)
        .map(function (entry) {
          return {
            title: entry.doc.title,
            location: entry.doc.location,
            excerpt: excerpt(entry.doc, needle),
          };
        });
      render(results);
    });
  }

  input.addEventListener("input", search);
  input.addEventListener("focus", load);

  input.addEventListener("keydown", function (event) {
    var items = panel.querySelectorAll("a");
    if (event.key === "Escape") {
      panel.hidden = true;
      input.blur();
    } else if (event.key === "ArrowDown" && items.length) {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
    } else if (event.key === "ArrowUp" && items.length) {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
    } else if (event.key === "Enter" && activeIndex >= 0 && items[activeIndex]) {
      event.preventDefault();
      window.location.href = items[activeIndex].href;
      return;
    } else {
      return;
    }
    Array.prototype.forEach.call(items, function (item, i) {
      item.classList.toggle("is-active", i === activeIndex);
    });
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".header__search")) panel.hidden = true;
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && document.activeElement !== input) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      event.preventDefault();
      input.focus();
    }
  });
})();

/**
 * Populates the version and project switcher from `versions.json` at the site root.
 *
 * The documentation site holds several builds at once: the current one at the root, a preview per
 * open pull request under `pr-<N>/`, and a build per tracked branch under `branch/<name>/`. Which
 * of those exist changes whenever a pull request opens or closes, so the list is fetched at read
 * time rather than baked into each page - a page built last week would otherwise offer previews
 * that have since been torn down.
 *
 * The manifest is written by the deploy workflow and looks like:
 *
 *     {
 *       "current": "",
 *       "versions": [{"name": "main", "path": ""}, {"name": "PR #27", "path": "pr-27"}],
 *       "projects": [{"name": "Omnis", "url": "https://marius-patrik.github.io/omnis/"}]
 *     }
 *
 * A site without the file simply keeps the control hidden.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-switcher]");
  if (!root) {
    return;
  }

  /**
   * Works out the site root from the current location and the page's own depth.
   *
   * Pages are nested arbitrarily deep, and a preview adds a further prefix, so the root cannot be
   * assumed to be one level up.
   *
   * @returns {string} Absolute path of the site root, with a trailing slash.
   */
  function siteRoot() {
    var base = document.querySelector("link[rel=stylesheet][href*='assets/theme.css']");
    if (base) {
      return base.getAttribute("href").replace(/assets\/theme\.css.*$/, "");
    }
    return "/";
  }

  /**
   * Fills a select element and navigates on change.
   *
   * @param {HTMLSelectElement} select Element to populate.
   * @param {Array<Object>} entries Items carrying `name` and either `path` or `url`.
   * @param {string} base Site root, used to resolve `path` entries.
   * @param {string} current The `path` currently being viewed.
   */
  function fill(select, entries, base, current) {
    entries.forEach(function (entry) {
      var option = document.createElement("option");
      option.textContent = entry.name;
      option.value = entry.url || base + (entry.path ? entry.path + "/" : "");
      if (entry.url === undefined && (entry.path || "") === (current || "")) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    select.addEventListener("change", function () {
      if (select.value) {
        window.location.href = select.value;
      }
    });
  }

  var base = siteRoot();
  fetch(base + "versions.json", { cache: "no-cache" })
    .then(function (response) {
      return response.ok ? response.json() : null;
    })
    .then(function (manifest) {
      if (!manifest) {
        return;
      }
      var versions = manifest.versions || [];
      var projects = manifest.projects || [];
      if (versions.length > 1) {
        fill(
          root.querySelector("[data-switcher-versions]"),
          versions,
          base,
          manifest.current || ""
        );
        root.hidden = false;
      }
      if (projects.length > 0) {
        var group = root.querySelector("[data-switcher-projects-group]");
        fill(root.querySelector("[data-switcher-projects]"), projects, base, null);
        group.hidden = false;
        root.hidden = false;
      }
    })
    .catch(function () {
      /* A site without a manifest keeps the control hidden; nothing to report. */
    });
})();
