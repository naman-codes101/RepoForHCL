// Saves tasks in the browser (localStorage). Exposes a global `Storage2`.
const Storage2 = (function () {
  const KEY = 'studentTasks.v1';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function save(tasks) {
    try {
      localStorage.setItem(KEY, JSON.stringify(tasks));
    } catch (e) {
      alert('Could not save tasks. Browser storage may be full or blocked.');
    }
  }

  return { load, save };
})();
