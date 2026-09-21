/* ============================================================
   LSR AI STUDIO — js/automations.js
   Automations: local schedule list (name, cron expression,
   task prompt, enabled toggle). Add / edit / delete / run-now.
   "Run now" injects the prompt into Chat as a new message.
   ============================================================ */
(function () {
  "use strict";

  var els = {};
  var editingId = null;

  function $(id) { return document.getElementById(id); }

  function init() {
    els = {
      list: $("sched-list"),
      formWrap: $("sched-form-wrap"),
      formTitle: $("sched-form-title"),
      name: $("sched-name"),
      cron: $("sched-cron"),
      task: $("sched-task"),
      enabled: $("sched-enabled"),
      add: $("btn-add-sched"),
      save: $("btn-save-sched"),
      cancel: $("btn-cancel-sched")
    };

    els.add.addEventListener("click", function () { openForm(null); });
    els.save.addEventListener("click", saveForm);
    els.cancel.addEventListener("click", closeForm);

    LSR.on("schedules-changed", render);
    render();
  }

  function validCron(cron) {
    // Lenient check: 5 space-separated fields with digits, *, /, -, ,
    var parts = cron.trim().split(/\s+/);
    return parts.length === 5 && parts.every(function (p) {
      return /^[\d*,/\-]+$/.test(p);
    });
  }

  function openForm(sched) {
    editingId = sched ? sched.id : null;
    els.formTitle.textContent = sched ? "Edit schedule" : "New schedule";
    els.name.value = sched ? sched.name : "";
    els.cron.value = sched ? sched.cron : "";
    els.task.value = sched ? sched.task : "";
    els.enabled.checked = sched ? !!sched.enabled : true;
    els.formWrap.style.display = "block";
    els.name.focus();
  }

  function closeForm() {
    editingId = null;
    els.formWrap.style.display = "none";
  }

  function saveForm() {
    var name = els.name.value.trim();
    var cron = els.cron.value.trim();
    var task = els.task.value.trim();
    if (!name) { LSR.toast("Give the schedule a name.", "error"); els.name.focus(); return; }
    if (!validCron(cron)) { LSR.toast("Cron expression looks invalid — use 5 fields, e.g. 0 9 * * *", "error"); els.cron.focus(); return; }
    if (!task) { LSR.toast("Describe the task prompt.", "error"); els.task.focus(); return; }

    if (editingId) {
      var s = LSR.state.schedules.find(function (x) { return x.id === editingId; });
      if (s) { s.name = name; s.cron = cron; s.task = task; s.enabled = els.enabled.checked; s.updatedAt = Date.now(); }
      LSR.toast("Schedule updated", "success");
    } else {
      LSR.state.schedules.push({
        id: LSR.uid("sched"),
        name: name,
        cron: cron,
        task: task,
        enabled: els.enabled.checked,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      LSR.toast("Schedule added", "success");
    }
    LSR.save();
    LSR.emit("schedules-changed");
    closeForm();
  }

  function deleteSched(id) {
    var s = LSR.state.schedules.find(function (x) { return x.id === id; });
    if (!s) return;
    if (!window.confirm("Delete schedule \"" + s.name + "\"?")) return;
    LSR.state.schedules = LSR.state.schedules.filter(function (x) { return x.id !== id; });
    LSR.save();
    LSR.emit("schedules-changed");
    LSR.toast("Schedule deleted", "info");
  }

  function toggleSched(id) {
    var s = LSR.state.schedules.find(function (x) { return x.id === id; });
    if (!s) return;
    s.enabled = !s.enabled;
    s.updatedAt = Date.now();
    LSR.save();
    LSR.emit("schedules-changed");
  }

  function runNow(id) {
    var s = LSR.state.schedules.find(function (x) { return x.id === id; });
    if (!s) return;
    LSR.toast("Firing \"" + s.name + "\" in Chat…", "info");
    LSR.chat.sendFromAutomation(s.task);
  }

  function render() {
    els.list.innerHTML = "";
    var items = LSR.state.schedules.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; });

    if (!items.length) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.style.flex = "none";
      empty.style.padding = "48px 20px";
      empty.innerHTML =
        '<div class="empty-orb" style="width:64px;height:64px;font-size:24px">◷</div>' +
        "<h2 style='font-size:18px'>No schedules yet</h2>" +
        "<p>Create your first schedule — e.g. a <b>morning briefing</b> at <span style='font-family:var(--mono)'>0 9 * * *</span> — and fire it into Chat whenever you like.</p>";
      els.list.appendChild(empty);
      return;
    }

    items.forEach(function (s) {
      var card = document.createElement("div");
      card.className = "sched-card glass";

      var top = document.createElement("div");
      top.className = "sched-top";

      var info = document.createElement("div");
      info.className = "sched-info";
      var h = document.createElement("h3");
      h.textContent = s.name;
      var meta = document.createElement("div");
      meta.className = "sched-meta";
      var cron = document.createElement("span");
      cron.className = "cron-chip";
      cron.textContent = s.cron;
      cron.title = "Cron expression";
      var flag = document.createElement("span");
      flag.className = "sched-enabled " + (s.enabled ? "on" : "off");
      flag.textContent = s.enabled ? "Enabled" : "Disabled";
      meta.appendChild(cron);
      meta.appendChild(flag);
      info.appendChild(h);
      info.appendChild(meta);
      top.appendChild(info);

      var toggle = document.createElement("label");
      toggle.className = "switch";
      toggle.title = s.enabled ? "Disable" : "Enable";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!s.enabled;
      cb.setAttribute("aria-label", "Enable schedule " + s.name);
      cb.addEventListener("change", function () { toggleSched(s.id); });
      var track = document.createElement("span");
      track.className = "track";
      toggle.appendChild(cb);
      toggle.appendChild(track);
      top.appendChild(toggle);
      card.appendChild(top);

      var task = document.createElement("div");
      task.className = "sched-task";
      task.textContent = s.task;
      card.appendChild(task);

      var actions = document.createElement("div");
      actions.className = "sched-actions";

      var run = document.createElement("button");
      run.className = "btn btn-sm btn-primary";
      run.textContent = "▶ Run now";
      run.addEventListener("click", function () { runNow(s.id); });

      var spacer = document.createElement("span");
      spacer.className = "spacer";

      var edit = document.createElement("button");
      edit.className = "btn btn-sm btn-ghost";
      edit.textContent = "Edit";
      edit.addEventListener("click", function () { openForm(s); });

      var del = document.createElement("button");
      del.className = "btn btn-sm btn-danger";
      del.textContent = "Delete";
      del.addEventListener("click", function () { deleteSched(s.id); });

      actions.appendChild(run);
      actions.appendChild(spacer);
      actions.appendChild(edit);
      actions.appendChild(del);
      card.appendChild(actions);

      els.list.appendChild(card);
    });
  }

  window.LSR = window.LSR || {};
  LSR.automations = { init: init, render: render, _validCron: validCron };
})();
