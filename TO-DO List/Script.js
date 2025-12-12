// State management
let tasks = [];
let currentFilter = 'all';
let currentDate = new Date();
let selectedDate = null;

// DOM elements
const taskInput = document.getElementById('taskInput');
const taskDescription = document.getElementById('taskDescription');
const taskDate = document.getElementById('taskDate');
const taskTime = document.getElementById('taskTime');
const taskPriority = document.getElementById('taskPriority');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const filterBtns = document.querySelectorAll('.filter-btn');
const calendarGrid = document.getElementById('calendarGrid');
const currentMonthEl = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const notification = document.getElementById('notification');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    renderCalendar();
    renderTasks();
    updateStats();
    checkReminders();
    setInterval(checkReminders, 60000); // Check every minute
});

// Add task
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

function addTask() {
    const title = taskInput.value.trim();
    if (!title) {
        showNotification('Please enter a task title!');
        return;
    }

    const task = {
        id: Date.now(),
        title,
        description: taskDescription.value.trim(),
        date: taskDate.value,
        time: taskTime.value,
        priority: taskPriority.value,
        completed: false,
        createdAt: new Date().toISOString()
    };

    tasks.push(task);
    saveTasks();
    renderTasks();
    updateStats();
    renderCalendar();
    clearInputs();
    showNotification('Task added successfully!');
}

function clearInputs() {
    taskInput.value = '';
    taskDescription.value = '';
    taskDate.value = '';
    taskTime.value = '';
    taskPriority.value = 'medium';
}

// Toggle task completion
function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        updateStats();
    }
}

// Delete task
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    updateStats();
    renderCalendar();
    showNotification('Task deleted!');
}

// Render tasks
function renderTasks() {
    const filteredTasks = tasks.filter(task => {
        if (currentFilter === 'completed') return task.completed;
        if (currentFilter === 'active') return !task.completed;
        return true;
    });

    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No tasks found</p>';
        return;
    }

    taskList.innerHTML = filteredTasks.map(task => `
        <li class="task-item priority-${task.priority} ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-content">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                    onchange="toggleTask(${task.id})">
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    <div class="task-meta">
                        ${task.date ? `<span><i class="far fa-calendar"></i>${formatDate(task.date)}</span>` : ''}
                        ${task.time ? `<span><i class="far fa-clock"></i>${task.time}</span>` : ''}
                        <span><i class="fas fa-flag"></i>${task.priority}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-btn delete" onclick="deleteTask(${task.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </li>
    `).join('');
}

// Filter tasks
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

// Calendar functions
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    currentMonthEl.textContent = new Date(year, month).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let calendarHTML = '';

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        calendarHTML += `<div class="calendar-day other-month">${daysInPrevMonth - i}</div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateString = date.toISOString().split('T')[0];
        const isToday = dateString === new Date().toISOString().split('T')[0];
        const hasTasks = tasks.some(task => task.date === dateString);
        const isSelected = selectedDate === dateString;

        calendarHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${hasTasks ? 'has-tasks' : ''} ${isSelected ? 'selected' : ''}" 
                data-date="${dateString}" onclick="selectDate('${dateString}')">
                ${day}
            </div>
        `;
    }

    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
        calendarHTML += `<div class="calendar-day other-month">${i}</div>`;
    }

    calendarGrid.innerHTML = calendarHTML;
}

function selectDate(dateString) {
    selectedDate = dateString;
    taskDate.value = dateString;
    renderCalendar();
}

prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// Update statistics
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('pendingTasks').textContent = pending;
}

// Check reminders
function checkReminders() {
    const now = new Date();
    const currentDateStr = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    tasks.forEach(task => {
        if (!task.completed && task.date === currentDateStr && task.time === currentTime) {
            showNotification(`⏰ Reminder: ${task.title}`, true);
            playNotificationSound();
        }
    });
}

// Notification
function showNotification(message, isReminder = false) {
    notification.textContent = message;
    notification.classList.add('show');
    
    if (isReminder && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('TaskMaster Reminder', {
            body: message,
            icon: '🔔'
        });
    }

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// Play notification sound
function playNotificationSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Local storage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const saved = localStorage.getItem('tasks');
    if (saved) {
        tasks = JSON.parse(saved);
    }
}

// Helper functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}
