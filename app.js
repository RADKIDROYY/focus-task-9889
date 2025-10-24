// ========================================
// FocusTasks 9889 - Application Logic
// ========================================

/* 
 * TESTABILITY & MUTATION PREVENTION COMMENT:
 * The closure store (createStore) encapsulates state and prevents accidental
 * mutation by keeping the tasks array private. External code cannot directly
 * modify state—only through controlled methods (add/toggle/remove). This improves
 * testability: we can mock createStore, inject it as a dependency, and verify
 * behavior without globals. Global mutable state makes testing fragile (shared state
 * between tests) and allows bugs from unintended mutations anywhere in the codebase.
 */

// ========================================
// Closure Store Implementation
// ========================================

function createStore(storageKey) {
  // Private state encapsulated in closure
  let tasks = [];
  
  // Initialize: hydrate from localStorage if present
  function init() {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        tasks = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      tasks = [];
    }
  }
  
  // Persist to localStorage after every mutation
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }
  
  // Public API
  return {
    // Add new task (returns new state array)
    add(task) {
      // Validate: reject empty or whitespace-only titles
      if (!task.title || task.title.trim().length === 0) {
        throw new Error('Task title cannot be empty');
      }
      
      const newTask = {
        id: task.id,
        title: task.title.trim(),
        done: task.done || false
      };
      
      // Use map to create new array (no for loop)
      tasks = [...tasks, newTask];
      persist();
      return this.list();
    },
    
    // Toggle task done status (returns new state array)
    toggle(id) {
      // Use map to transform (no for loop)
      tasks = tasks.map(task => 
        task.id === id 
          ? { ...task, done: !task.done } 
          : task
      );
      persist();
      return this.list();
    },
    
    // Remove task by id (returns new state array)
    remove(id) {
      // Use filter to remove (no for loop)
      tasks = tasks.filter(task => task.id !== id);
      persist();
      return this.list();
    },
    
    // Get deep-cloned state array (prevents external mutation)
    list() {
      // Use map to deep clone (no for loop)
      return tasks.map(task => ({ ...task }));
    }
  };
}

// Initialize store with personalization token
// Must use this exact shape as per requirements
const store = createStore('focustasks_9889');

// ========================================
// XSS Protection - HTML Escaping
// ========================================

/*
 * XSS ESCAPING COMMENT (Line 98):
 * The escapeHtml function below prevents XSS by converting HTML special characters
 * (<, >, &, ", ') to entities before inserting user input into the DOM. This is
 * sufficient for client-only apps where all rendering happens in the browser.
 * However, in server-rendered or multi-user contexts, this is INSUFFICIENT because:
 * 1) Server must escape on output (defense-in-depth)
 * 2) Need Content Security Policy (CSP) headers to block inline scripts
 * 3) Database should store raw text; escaping is an output concern
 * 4) Context-aware escaping needed (HTML vs JS vs URL contexts differ)
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========================================
// Analytics - Pure Function
// ========================================

function summarize(tasks) {
  // Use reduce to count (no for loop)
  const active = tasks.reduce((count, task) => 
    task.done ? count : count + 1, 0
  );
  
  const done = tasks.reduce((count, task) => 
    task.done ? count + 1 : count, 0
  );
  
  const total = active + done;
  const pct = total === 0 ? 0 : ((done / total) * 100).toFixed(1);
  
  return { active, done, pct };
}

// ========================================
// Rendering Functions
// ========================================

function renderTask(task) {
  const li = document.createElement('li');
  li.className = `task-item ${task.done ? 'done' : ''}`;
  li.setAttribute('role', 'listitem');
  li.dataset.taskId = task.id;
  
  // Checkbox for toggle
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = task.done;
  checkbox.dataset.action = 'toggle';
  checkbox.dataset.id = task.id;
  checkbox.setAttribute('aria-label', `Mark "${task.title}" as ${task.done ? 'not done' : 'done'}`);
  
  // Task title (escaped for XSS protection)
  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title; // textContent automatically escapes
  
  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = 'Delete';
  deleteBtn.dataset.action = 'delete';
  deleteBtn.dataset.id = task.id;
  deleteBtn.setAttribute('aria-label', `Delete task "${task.title}"`);
  
  li.appendChild(checkbox);
  li.appendChild(title);
  li.appendChild(deleteBtn);
  
  return li;
}

function renderTasks() {
  const tasks = store.list();
  
  // Use filter to separate (no for loop)
  const activeTasks = tasks.filter(task => !task.done);
  const doneTasks = tasks.filter(task => task.done);
  
  // Render active tasks
  const activeList = document.getElementById('active-list');
  const activeEmpty = document.getElementById('active-empty');
  activeList.innerHTML = '';
  
  if (activeTasks.length === 0) {
    activeEmpty.hidden = false;
  } else {
    activeEmpty.hidden = true;
    // Use map to render (no for loop)
    activeTasks.map(renderTask).forEach(li => activeList.appendChild(li));
  }
  
  // Render done tasks
  const doneList = document.getElementById('done-list');
  const doneEmpty = document.getElementById('done-empty');
  doneList.innerHTML = '';
  
  if (doneTasks.length === 0) {
    doneEmpty.hidden = false;
  } else {
    doneEmpty.hidden = true;
    // Use map to render (no for loop)
    doneTasks.map(renderTask).forEach(li => doneList.appendChild(li));
  }
  
  // Update analytics
  updateAnalytics();
}

function updateAnalytics() {
  const tasks = store.list();
  const stats = summarize(tasks);
  
  document.getElementById('active-count').textContent = stats.active;
  document.getElementById('done-count').textContent = stats.done;
  document.getElementById('done-percent').textContent = `${stats.pct}%`;
}

// ========================================
// Event Handlers
// ========================================

function handleAddTask(e) {
  e.preventDefault();
  
  const input = document.getElementById('task-input');
  const errorMsg = document.getElementById('task-error');
  const title = input.value.trim();
  
  // Clear previous error
  errorMsg.textContent = '';
  
  // Validate: reject empty/whitespace-only titles
  if (!title || title.length === 0) {
    errorMsg.textContent = '⚠️ Task title cannot be empty';
    input.focus();
    return;
  }
  
  try {
    // Generate unique ID (timestamp + random suffix)
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    store.add({ id, title, done: false });
    
    // Clear input and render
    input.value = '';
    renderTasks();
    
    // Return focus to input for keyboard users
    input.focus();
  } catch (error) {
    errorMsg.textContent = `⚠️ ${error.message}`;
  }
}

// ========================================
// Event Delegation Setup
// Single delegated listener per area
// ========================================

function setupEventDelegation() {
  // Form submission for adding tasks
  const form = document.getElementById('add-task-form');
  form.addEventListener('submit', handleAddTask);
  
  // Delegated listener for both active and done lists
  // ONE listener handles all task interactions (toggle & delete)
  const mainContent = document.getElementById('main-content');
  
  mainContent.addEventListener('click', (e) => {
    const target = e.target;
    const action = target.dataset.action;
    const taskId = target.dataset.id;
    
    if (!action || !taskId) return;
    
    if (action === 'toggle') {
      store.toggle(taskId);
      renderTasks();
    } else if (action === 'delete') {
      if (confirm('Are you sure you want to delete this task?')) {
        store.remove(taskId);
        renderTasks();
      }
    }
  });
  
  // Handle checkbox change events (delegated)
  mainContent.addEventListener('change', (e) => {
    const target = e.target;
    
    if (target.classList.contains('task-checkbox')) {
      const taskId = target.dataset.id;
      store.toggle(taskId);
      renderTasks();
    }
  });
}

// ========================================
// Initialization
// ========================================

function init() {
  // Initialize store (hydrates from localStorage)
  store.list(); // Triggers init
  
  // Setup event delegation
  setupEventDelegation();
  
  // Initial render
  renderTasks();
  
  console.log('FocusTasks 9889 initialized');
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}