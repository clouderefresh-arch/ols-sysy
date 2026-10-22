(function () {
  var doc = document;
  var $ = function (id) { return doc.getElementById(id); };

  var nav = $("site-nav");
  var toggle = $("nav-toggle");

  function closeNav() {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Меню";
  }

  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.textContent = open ? "Закрыть" : "Меню";
  });

  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) closeNav();
  });

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  doc.addEventListener("click", function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute("href").slice(1);
    var target = id && doc.getElementById(id);
    if (!target) return;
    e.preventDefault();
    if (history.pushState) history.pushState(null, "", "#" + id);
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });

  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var sections = links.map(function (a) {
    return doc.querySelector(a.getAttribute("href"));
  }).filter(Boolean);

  if ("IntersectionObserver" in window) {
    var current = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) current = entry.target.id;
      });
      links.forEach(function (a) {
        var on = a.getAttribute("href") === "#" + current;
        if (on) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (section) { io.observe(section); });
  }

  var modeInput = $("f-mode");
  var chambers = doc.querySelectorAll(".chamber");
  var modeNote = $("mode-note");
  var chips = doc.querySelectorAll(".chip");
  var notes = {
    "": "Оба режима квалифицированы. Выберите, что нужно в конкретном рейсе.",
    "2-8": "В рейсе задан режим +2…+8 °C. Вторая камера в этой заявке не используется.",
    "15-25": "В рейсе задан режим +15…+25 °C. Первая камера в этой заявке не используется.",
    "dual": "Оба квалифицированных режима в одной машине: кузов разделён перегородкой.",
    "range": "Нужен другой режим внутри диапазона +2…+25 °C. Его уточним в расчёте."
  };

  function paintMode(value) {
    chambers.forEach(function (chamber) {
      var id = chamber.getAttribute("data-chamber");
      chamber.classList.remove("is-on", "is-off");
      if (!value || value === "range") return;
      if (value === "dual" || value === id) chamber.classList.add("is-on");
      else chamber.classList.add("is-off");
    });
    modeNote.textContent = notes[value] || notes[""];
    chips.forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip.getAttribute("data-mode") === value ? "true" : "false");
    });
    if (modeInput.value !== value) modeInput.value = value;
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      paintMode(chip.getAttribute("data-mode"));
    });
  });
  modeInput.addEventListener("change", function () { paintMode(modeInput.value); });

  var form = $("request-form");
  var ready = $("request-ready");
  var summary = $("form-summary");
  var output = $("request-text");
  var copyBtn = $("copy-request");

  function showForm() {
    ready.hidden = true;
    form.hidden = false;
  }

  doc.addEventListener("click", function (e) {
    var link = e.target.closest("[data-geo], [data-extra]");
    if (!link) return;
    showForm();
    var geo = link.getAttribute("data-geo");
    if (geo) $("f-geo").value = geo;
    if (link.getAttribute("data-extra") === "prr") $("f-prr").checked = true;
    if (link.getAttribute("data-extra") === "ins") $("f-ins").checked = true;
  });

  function fieldOf(el) { return el.closest(".field"); }

  function setError(el, message) {
    var box = fieldOf(el);
    var err = box.querySelector(".err");
    if (message) {
      box.classList.add("is-invalid");
      el.setAttribute("aria-invalid", "true");
      err.textContent = message;
    } else {
      box.classList.remove("is-invalid");
      el.removeAttribute("aria-invalid");
      err.textContent = "";
    }
    return !message;
  }

  function digits(value) { return String(value || "").replace(/\D/g, ""); }

  function validate() {
    var ok = true;
    var first = null;
    function check(el, message) {
      var good = setError(el, message);
      if (!good && !first) first = el;
      ok = ok && good;
    }
    check($("f-geo"), $("f-geo").value ? "" : "Выберите географию.");
    check($("f-from"), $("f-from").value.trim() ? "" : "Укажите, откуда забирать груз.");
    check($("f-to"), $("f-to").value.trim() ? "" : "Укажите, куда везти груз.");
    check($("f-cargo"), $("f-cargo").value.trim() ? "" : "Опишите тип груза.");
    var amount = Number($("f-amount").value);
    check($("f-amount"), amount > 0 ? "" : "Укажите объём больше нуля.");
    check($("f-mode"), $("f-mode").value ? "" : "Выберите температурный режим.");
    check($("f-name"), $("f-name").value.trim() ? "" : "Как к вам обращаться.");
    var phone = digits($("f-phone").value);
    check($("f-phone"), phone.length >= 10 && phone.length <= 15 ? "" : "Нужен телефон: от 10 цифр.");
    var email = $("f-email").value.trim();
    check($("f-email"), !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "Проверьте написание почты.");
    if (first) first.focus();
    return ok;
  }

  function volumeNote() {
    var note = $("volume-note");
    var amount = Number($("f-amount").value);
    var unit = $("f-unit").value;
    if (!amount) {
      note.textContent = "Обычно принимаем от 500 кг до 20 т.";
      return;
    }
    var kg = unit === "t" ? amount * 1000 : amount;
    if (kg < 500 || kg > 20000) {
      note.textContent = "Этот объём вне обычной вилки 500 кг — 20 т. Расчёт всё равно можно подготовить.";
    } else {
      note.textContent = "Объём внутри обычной вилки: от 500 кг до 20 т.";
    }
  }

  $("f-amount").addEventListener("input", volumeNote);
  $("f-unit").addEventListener("change", volumeNote);

  ["f-geo", "f-from", "f-to", "f-cargo", "f-amount", "f-mode", "f-name", "f-phone", "f-email"].forEach(function (id) {
    $(id).addEventListener("blur", function () {
      if (form.dataset.tried === "1") validate();
    });
  });

  var modeLabels = {
    "2-8": "+2…+8 °C",
    "15-25": "+15…+25 °C",
    "dual": "оба режима в одной машине: +2…+8 °C и +15…+25 °C",
    "range": "другой режим в диапазоне +2…+25 °C"
  };
  var geoLabels = {
    mo: "Москва и Московская область",
    rf: "Российская Федерация"
  };

  function line(label, value) { return label + ": " + value; }

  function buildText() {
    var unit = $("f-unit").value === "t" ? "т" : "кг";
    var rows = [
      "Заявка на расчёт перевозки — ООО «ОЛС»",
      line("География", geoLabels[$("f-geo").value] || $("f-geo").value),
      line("Откуда", $("f-from").value.trim()),
      line("Куда", $("f-to").value.trim()),
      line("Груз", $("f-cargo").value.trim()),
      line("Объём", $("f-amount").value.trim() + " " + unit),
      line("Режим", modeLabels[$("f-mode").value] || $("f-mode").value),
      line("Срок", $("f-date").value || "не указан"),
      line("Погрузка и разгрузка", $("f-prr").checked ? "нужна" : "не нужна"),
      line("Страхование груза", $("f-ins").checked ? "нужно" : "не нужно"),
      line("Имя", $("f-name").value.trim()),
      line("Телефон", $("f-phone").value.trim()),
      line("Почта", $("f-email").value.trim() || "не указана"),
      line("Комментарий", $("f-comment").value.trim() || "нет")
    ];
    return rows.join("\n");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    form.dataset.tried = "1";
    summary.textContent = "";
    if (!validate()) {
      summary.textContent = "Проверьте поля, отмеченные как обязательные.";
      return;
    }
    output.textContent = buildText();
    form.hidden = true;
    ready.hidden = false;
    copyBtn.textContent = "Скопировать текст";
    ready.querySelector("h3").focus();
  });

  copyBtn.addEventListener("click", function () {
    var text = output.textContent;
    function done() { copyBtn.textContent = "Скопировано"; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        fallbackCopy(text);
        done();
      });
    } else {
      fallbackCopy(text);
      done();
    }
  });

  function fallbackCopy(text) {
    var area = doc.createElement("textarea");
    area.value = text;
    doc.body.appendChild(area);
    area.select();
    doc.execCommand("copy");
    area.remove();
  }

  $("request-again").addEventListener("click", function () {
    form.reset();
    form.dataset.tried = "";
    summary.textContent = "";
    form.querySelectorAll(".field").forEach(function (box) {
      box.classList.remove("is-invalid");
      var err = box.querySelector(".err");
      if (err) err.textContent = "";
    });
    form.querySelectorAll("[aria-invalid]").forEach(function (el) {
      el.removeAttribute("aria-invalid");
    });
    paintMode("");
    volumeNote();
    showForm();
    $("f-from").focus();
  });

  paintMode("");
  volumeNote();

  var revealEls = doc.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var revealIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealIo.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { revealIo.observe(el); });
  }

  var reefer = doc.querySelector(".reefer");
  if (reefer && !reduceMotion && "IntersectionObserver" in window) {
    reefer.classList.add("is-gated");
    var reeferIo = new IntersectionObserver(function (entries) {
      reefer.classList.toggle("is-playing", entries.some(function (entry) {
        return entry.isIntersecting;
      }));
    }, { rootMargin: "160px" });
    reeferIo.observe(reefer);
  }
})();
