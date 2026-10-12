(function () {
  const $ = (id) => document.getElementById(id);
  const RANK = { high: 0, medium: 1, low: 2 };

  let tasks = Storage2.load();
  let editId = null;

  // ---------- date helpers (due dates are plain YYYY-MM-DD strings) ----------
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  const isOverdue = (t) => !t.done && t.due && t.due < todayStr();

  function dueLabel(t) {
    if (!t.due) return 'No due date';
    const pretty = new Date(t.due + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    if (t.done) return 'Due ' + pretty;
    if (t.due < todayStr()) return 'Overdue, was due ' + pretty;
    if (t.due === todayStr()) return 'Due today';
    return 'Due ' + pretty;
  }

  // ---------- rendering ----------
  function visibleTasks() {
    const status = $('filterStatus').value;
    const prio = $('filterPriority').value;
    const q = $('search').value.trim().toLowerCase();
    const sort = $('sortBy').value;

    return tasks
      .filter((t) =>
        (status === 'all' || (status === 'completed') === t.done) &&
        (prio === 'all' || t.priority === prio) &&
        (!q || (t.title + ' ' + t.description).toLowerCase().includes(q)))
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (sort === 'newest') return b.created - a.created;
        if (sort === 'priority' && RANK[a.priority] !== RANK[b.priority]) return RANK[a.priority] - RANK[b.priority];
        if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
        if (a.due !== b.due) return a.due ? -1 : 1;
        return b.created - a.created;
      });
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text; // textContent keeps user input safe
    return e;
  }

  function taskNode(t) {
    const li = el('li', 'task p-' + t.priority + (t.done ? ' done' : '') + (isOverdue(t) ? ' overdue' : ''));
    li.dataset.id = t.id;

    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = t.done;
    cb.dataset.action = 'toggle';
    cb.setAttribute('aria-label', 'Mark "' + t.title + '" as ' + (t.done ? 'pending' : 'completed'));

    const body = el('div', 'body');
    body.appendChild(el('div', 'title', t.title));
    if (t.description) body.appendChild(el('div', 'desc', t.description));
    const meta = el('div', 'meta');
    meta.appendChild(el('span', 'tag ' + t.priority, t.priority));
    meta.appendChild(el('span', '', dueLabel(t)));
    body.appendChild(meta);

    const row = el('div', 'row');
    [['edit', 'Edit'], ['delete', 'Delete']].forEach(([action, label]) => {
      const b = el('button', 'btn small', label);
      b.type = 'button';
      b.dataset.action = action;
      row.appendChild(b);
    });

    li.append(cb, body, row);
    return li;
  }

  function render() {
    const list = $('taskList');
    list.replaceChildren();
    const shown = visibleTasks();
    if (shown.length) {
      shown.forEach((t) => list.appendChild(taskNode(t)));
    } else {
      list.appendChild(el('li', 'empty', tasks.length ? 'No tasks match these filters.' : 'No tasks yet. Add your first task above.'));
    }

    const done = tasks.filter((t) => t.done).length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    $('statTotal').textContent = tasks.length;
    $('statDone').textContent = done;
    $('statPending').textContent = tasks.length - done;
    $('statOverdue').textContent = tasks.filter(isOverdue).length;
    $('progress').style.width = pct + '%';
    document.querySelector('.bar').setAttribute('aria-valuenow', pct);
  }

  function commit() {
    Storage2.save(tasks);
    render();
  }

  // ---------- form ----------
  function resetForm() {
    editId = null;
    $('taskForm').reset();
    $('priority').value = 'medium';
    $('submitBtn').textContent = 'Add task';
    $('cancelEdit').hidden = true;
  }

  $('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('title').value.trim();
    if (!title) return;
    const data = {
      title,
      description: $('description').value.trim(),
      due: $('dueDate').value,
      priority: $('priority').value,
    };
    if (editId) {
      tasks = tasks.map((t) => (t.id === editId ? Object.assign({}, t, data) : t));
    } else {
      tasks.push(Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), done: false, created: Date.now() }, data));
    }
    resetForm();
    commit();
  });

  $('cancelEdit').addEventListener('click', resetForm);

  // ---------- list actions (event delegation) ----------
  $('taskList').addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    const id = e.target.closest('.task').dataset.id;
    const t = tasks.find((x) => x.id === id);
    if (!t) return;

    if (action === 'toggle') {
      t.done = !t.done;
      commit();
    } else if (action === 'delete') {
      if (!confirm('Delete "' + t.title + '"?')) return;
      tasks = tasks.filter((x) => x.id !== id);
      if (editId === id) resetForm();
      commit();
    } else if (action === 'edit') {
      editId = id;
      $('title').value = t.title;
      $('description').value = t.description;
      $('dueDate').value = t.due;
      $('priority').value = t.priority;
      $('submitBtn').textContent = 'Save changes';
      $('cancelEdit').hidden = false;
      $('title').focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // ---------- filters ----------
  ['filterStatus', 'filterPriority', 'sortBy'].forEach((id) => $(id).addEventListener('change', render));
  $('search').addEventListener('input', render);

  $('clearDone').addEventListener('click', () => {
    const n = tasks.filter((t) => t.done).length;
    if (n && confirm('Remove ' + n + ' completed task(s)?')) {
      tasks = tasks.filter((t) => !t.done);
      commit();
    }
  });

  render();
})();
