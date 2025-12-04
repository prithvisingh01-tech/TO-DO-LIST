// --- 1. DOM Elements & Constants ---
const TODO_STORAGE_KEY = 'taskList';
const todoInput = document.getElementById('todo-input');
const addButton = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');

// New Calendar/Scheduler elements
const currentMonthYear = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const calendarDaysOfWeek = document.getElementById('calendar-days-of-week');
const calendarDates = document.getElementById('calendar-dates');
const taskDateInput = document.getElementById('task-date-input');
const taskFrequency = document.getElementById('task-frequency');

// Modal elements
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');

// Calendar State
let currentCalendarDate = new Date();
let selectedDate = new Date(); // Stores the date currently selected in the calendar
const TODAY = new Date();

// Helper to format date as YYYY-MM-DD (standard format for input[type="date"] and comparison)
const formatDate = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
};

// Initialize the task date input to today's date
taskDateInput.value = formatDate(TODAY);

// Helper to check if two dates are the same day (ignoring time)
const isSameDay = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

// --- 2. Local Storage Functions ---

/**
 * Loads tasks from localStorage.
 * @returns {Array} List of tasks.
 */
const loadTasks = () => {
    try {
        const storedTasks = localStorage.getItem(TODO_STORAGE_KEY);
        // Ensure that tasks have all required properties for scheduling
        let tasks = storedTasks ? JSON.parse(storedTasks) : [];
        tasks.forEach(task => {
            if (!task.dueDate) task.dueDate = formatDate(task.timestamp);
            if (!task.frequency) task.frequency = 'once';
        });
        return tasks;
    } catch (e) {
        console.error("Could not load tasks from local storage", e);
        return [];
    }
};

/**
 * Saves the current list of tasks to localStorage.
 * @param {Array} tasks - The list of tasks to save.
 */
const saveTasks = (tasks) => {
    try {
        localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
        console.error("Could not save tasks to local storage", e);
    }
};

// --- 3. Custom Modal Implementation (Unchanged) ---
const showConfirmDialog = (title, message) => {
    modalTitle.textContent = title;
    modalBody.textContent = message;
    modal.classList.remove('hidden');

    return new Promise((resolve) => {
        const onConfirm = () => {
            modal.classList.add('hidden');
            modalConfirm.removeEventListener('click', onConfirm);
            modalCancel.removeEventListener('click', onCancel);
            resolve(true);
        };

        const onCancel = () => {
            modal.classList.add('hidden');
            modalConfirm.removeEventListener('click', onConfirm);
            modalCancel.removeEventListener('click', onCancel);
            resolve(false);
        };

        modalConfirm.addEventListener('click', onConfirm);
        modalCancel.addEventListener('click', onCancel);
    });
};

// --- 4. Task Scheduling Logic ---

/**
 * Checks if a scheduled task is due on a given date.
 * @param {Object} task - The task object.
 * @param {Date} date - The date to check against.
 * @returns {boolean} True if the task is due.
 */
const isTaskDueOnDate = (task, date) => {
    const taskDate = new Date(task.dueDate);
    const checkDate = new Date(formatDate(date)); // Normalize time

    // 1. Check if the task is completed (if so, only show if it was completed TODAY)
    // NOTE: For recurring tasks, completion logic is complex. For simplicity, we show all incomplete recurring tasks.
    if (task.completed && !isSameDay(taskDate, checkDate)) {
        return false;
    }

    // 2. Check frequency
    const taskDay = taskDate.getDate();
    const checkDay = checkDate.getDate();
    const taskMonth = taskDate.getMonth();
    const checkMonth = checkDate.getMonth();
    const taskDayOfWeek = taskDate.getDay(); // 0 (Sun) - 6 (Sat)
    const checkDayOfWeek = checkDate.getDay();

    switch (task.frequency) {
        case 'once':
            return formatDate(taskDate) === formatDate(checkDate);

        case 'daily':
            // Due every day starting from the original due date
            return checkDate >= taskDate;

        case 'weekly':
            // Due on the same day of the week (e.g., every Tuesday) starting from the original due date
            return checkDate >= taskDate && taskDayOfWeek === checkDayOfWeek;

        case 'monthly':
            // Due on the same day of the month (e.g., 15th) starting from the original due date
            return checkDate >= taskDate && taskDay === checkDay;

        default:
            return false;
    }
};

// --- 5. CRUD Operations ---

/**
 * Adds a new task to the list with scheduling info.
 */
const addTask = () => {
    const text = todoInput.value.trim();
    const dueDate = taskDateInput.value;
    const frequency = taskFrequency.value;

    if (!text || !dueDate) return;
    
    const tasks = loadTasks();
    const newTask = {
        id: Date.now(),
        text: text,
        completed: false,
        timestamp: Date.now(),
        dueDate: dueDate,
        frequency: frequency
    };
    
    tasks.push(newTask);
    saveTasks(tasks);
    renderTasks();
    // After adding a task, ensure the calendar view updates if it falls in the current month
    renderCalendar(); 
    todoInput.value = '';
};

// Deleting, Toggling, and Editing are updated to rely on renderTasks which now uses filtering.
const deleteTask = async (taskId) => {
    const confirmed = await showConfirmDialog("Delete Task", "Are you sure you want to delete this task? This action cannot be undone.");
    if (!confirmed) return;

    let tasks = loadTasks();
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasks(tasks);
    renderTasks();
    renderCalendar(); // Update calendar dots
};

const toggleTask = (taskId) => {
    let tasks = loadTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        saveTasks(tasks);
        renderTasks();
        renderCalendar(); // Update calendar dots
    }
};

const editTask = (taskId, newText) => {
    if (!newText.trim()) return;

    let tasks = loadTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].text = newText.trim();
        saveTasks(tasks);
        renderTasks();
    }
};

// --- 6. Calendar Rendering Logic ---

/**
 * Initializes and renders the calendar days of the week.
 */
const initializeDaysOfWeek = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    calendarDaysOfWeek.innerHTML = days.map(day => `<span>${day}</span>`).join('');
};

/**
 * Renders the calendar grid for the current month.
 */
const renderCalendar = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-11
    
    // Set header text
    currentMonthYear.textContent = currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Determine tasks that fall within this month to show dots
    const allTasks = loadTasks();
    const tasksDueThisMonth = {}; // { 'YYYY-MM-DD': true }

    // Pre-calculate which dates have tasks
    const tempDate = new Date(year, month, 1);
    while (tempDate.getMonth() === month) {
        const dateString = formatDate(tempDate);
        if (allTasks.some(task => isTaskDueOnDate(task, tempDate) && !task.completed)) {
             tasksDueThisMonth[dateString] = true;
        }
        tempDate.setDate(tempDate.getDate() + 1);
    }
    
    // Clear dates
    calendarDates.innerHTML = '';

    // Determine the first day of the month (0=Sun, 6=Sat)
    const firstDay = new Date(year, month, 1).getDay();
    // Determine the last day of the month
    const lastDate = new Date(year, month + 1, 0).getDate();

    // Add leading empty days
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('calendar-date', 'empty');
        calendarDates.appendChild(emptyDiv);
    }

    // Add days of the month
    for (let date = 1; date <= lastDate; date++) {
        const dateObj = new Date(year, month, date);
        const dateString = formatDate(dateObj);

        const dateDiv = document.createElement('div');
        dateDiv.classList.add('calendar-date');
        dateDiv.textContent = date;
        dateDiv.dataset.date = dateString;
        
        // Add classes for styling
        if (isSameDay(dateObj, TODAY)) {
            dateDiv.classList.add('today');
        }
        if (isSameDay(dateObj, selectedDate)) {
            dateDiv.classList.add('selected');
        }
        if (tasksDueThisMonth[dateString]) {
            dateDiv.classList.add('has-task');
        }
        
        // Click handler to select date and re-render tasks
        dateDiv.addEventListener('click', () => {
            selectedDate = dateObj;
            renderCalendar(); // Re-render calendar to update selection highlight
            renderTasks();    // Re-render task list to filter by selected date
        });

        calendarDates.appendChild(dateDiv);
    }
};

/**
 * Navigates the calendar to the previous month.
 */
const prevMonth = () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
    // Re-render tasks in case the currently selected day is now in the previous month (optional)
    renderTasks(); 
};

/**
 * Navigates the calendar to the next month.
 */
const nextMonth = () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
    // Re-render tasks in case the currently selected day is now in the next month (optional)
    renderTasks();
};


// --- 7. UI Rendering (Modified to use selectedDate filter) ---

const renderTasks = () => {
    const allTasks = loadTasks();
    todoList.innerHTML = ''; // Clear the current list

    // Filter tasks based on the currently selected date in the calendar
    let filteredTasks = allTasks.filter(task => isTaskDueOnDate(task, selectedDate));

    // Sort tasks: Incomplete first, then by timestamp (newest first)
    filteredTasks.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return b.timestamp - a.timestamp;
    });

    // Handle empty state message
    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    filteredTasks.forEach(task => {
        const listItem = document.createElement('li');
        listItem.id = `task-${task.id}`;
        listItem.classList.add('todo-item');
        
        if (task.completed) {
            listItem.classList.add('completed');
        }

        // Task Content Container
        const taskContentDiv = document.createElement('div');
        taskContentDiv.classList.add('task-content');

        // Task Text Span
        const taskTextSpan = document.createElement('span');
        taskTextSpan.classList.add('task-text');
        taskTextSpan.textContent = task.text;
        taskTextSpan.contentEditable = 'false';

        // Task Metadata (Due Date & Frequency)
        const taskMetaSpan = document.createElement('span');
        taskMetaSpan.classList.add('task-meta');
        
        let freqDisplay = task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1);
        taskMetaSpan.textContent = `Frequency: ${freqDisplay}`;


        // Action Buttons Container
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('actions');

        // Complete/Toggle Button
        const completeBtn = document.createElement('button');
        completeBtn.classList.add('action-btn', 'complete-btn');
        
        if (task.completed) {
            completeBtn.innerHTML = '&#10003;'; // Checkmark
            completeBtn.title = 'Mark Incomplete';
        } else {
            completeBtn.innerHTML = '&#9675;'; // Circle
            completeBtn.title = 'Mark Complete';
        }
        completeBtn.addEventListener('click', () => toggleTask(task.id));

        // Edit Button (Logic remains the same)
        const editBtn = document.createElement('button');
        editBtn.classList.add('action-btn', 'edit-btn');
        editBtn.innerHTML = '&#9998;'; // Pencil icon
        editBtn.title = 'Edit Task';
        
        editBtn.addEventListener('click', () => {
            const isEditing = taskTextSpan.contentEditable === 'true';

            if (isEditing) {
                taskTextSpan.contentEditable = 'false';
                editBtn.innerHTML = '&#9998;';
                editBtn.classList.remove('save-mode');
                editTask(task.id, taskTextSpan.textContent);
            } else {
                taskTextSpan.contentEditable = 'true';
                taskTextSpan.focus();
                
                const range = document.createRange();
                range.selectNodeContents(taskTextSpan);
                range.collapse(false);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                
                editBtn.innerHTML = '&#10003;';
                editBtn.classList.add('save-mode');
            }
        });
        
        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('action-btn', 'delete-btn');
        deleteBtn.innerHTML = '&times;'; // 'X' icon
        deleteBtn.title = 'Delete Task';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));

        // Assemble the element
        taskContentDiv.appendChild(taskTextSpan);
        taskContentDiv.appendChild(taskMetaSpan);

        actionsDiv.appendChild(completeBtn);
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        listItem.appendChild(taskContentDiv);
        listItem.appendChild(actionsDiv);
        todoList.appendChild(listItem);
    });
};

// --- 8. Event Listeners & Initial Load ---

// Calendar Navigation
prevMonthBtn.addEventListener('click', prevMonth);
nextMonthBtn.addEventListener('click', nextMonth);

// Task Addition
addButton.addEventListener('click', addTask);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Set initial selected date to today and render everything
window.onload = () => {
    initializeDaysOfWeek();
    renderCalendar();
    renderTasks();
};
