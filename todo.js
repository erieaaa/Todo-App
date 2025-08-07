// --- 1. STATE MANAGEMENT ---
let tasks = [];
let currentSort = 'manual';

// --- 2. DOM ELEMENT SELECTION ---
const taskList = document.getElementById('task-list');
const addTaskBtn = document.getElementById('add-task-btn');
const sortSelect = document.getElementById('sort-select');
const modal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const cancelBtn = document.getElementById('cancel-btn');
const addSubtaskBtn = document.getElementById('add-subtask-btn');
const subtaskList = document.getElementById('subtask-list');
const subtaskInput = document.getElementById('subtask-input');
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-desc');
const taskDueDateInput = document.getElementById('task-due-date');

// --- 3. FUNCTIONS ---

/**
 * Sorts the tasks array based on the currentSort value.
 */
function sortTasks() {
    switch (currentSort) {
        case 'due-date-asc':
            tasks.sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
            break;
        case 'due-date-desc':
            tasks.sort((a, b) => {
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(b.dueDate) - new Date(a.dueDate);
            });
            break;
        case 'title-asc':
            tasks.sort((a, b) => a.title.localeCompare(b.title));
            break;
        // 'manual' does not need sorting here, it's handled by drag/drop
        default:
            break;
    }
}

function getDueDateStatus(dueDateString) {
    if (!dueDateString) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateString + 'T00:00:00');
    if (dueDate < today) return 'due-date-overdue';
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'due-date-today';
    if (diffDays <= 7) return 'due-date-near';
    return 'due-date-safe';
}

/**
 * Renders the entire list of tasks to the DOM after sorting.
 */
function renderTasks() {
    sortTasks(); // Sort the array before rendering
    taskList.innerHTML = ''; // Clear existing list

    if (tasks.length === 0) {
        taskList.innerHTML = `<p style="text-align:center; color:#999;">No tasks yet. Add one to get started!</p>`;
        return;
    }

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.setAttribute('data-task-id', task.id);
        
        // Enable or disable dragging based on sort mode
        if (currentSort === 'manual') {
            li.draggable = true;
            li.style.cursor = 'grab';
        } else {
            li.draggable = false;
            li.style.cursor = 'default';
        }

        const completedSubtasks = task.subtasks.filter(st => st.completed).length;
        const descriptionPreview = task.description ? task.description.split(' ').slice(0, 5).join(' ') + '...' : '';
        const dueDateStatusClass = getDueDateStatus(task.dueDate);

        const subtasksHTML = task.subtasks.map((subtask, index) => `
            <li class="${subtask.completed ? 'completed' : ''}">
                <input type="checkbox" id="subtask-${task.id}-${index}" data-subtask-index="${index}" ${subtask.completed ? 'checked' : ''}>
                <label for="subtask-${task.id}-${index}">${subtask.text}</label>
            </li>
        `).join('');

        li.innerHTML = `
            <div class="task-summary">
                <div class="task-content">
                    <div class="task-title">
                        ${task.title}
                        ${(task.description || task.subtasks.length > 0) ? '<span class="toggle-arrow">&#9654;</span>' : ''}
                    </div>
                    <div class="task-meta">
                        ${task.subtasks.length > 0 ? `<span><span class="icon">&#10003;</span>${completedSubtasks}/${task.subtasks.length}</span>` : ''}
                        ${task.description ? `<span class="desc-preview" title="${task.description}">${descriptionPreview}</span>` : ''}
                    </div>
                </div>
                ${task.dueDate ? `<div class="due-date ${dueDateStatusClass}">Due: ${formatDate(task.dueDate)}</div>` : ''}
                <div class="task-actions">
                    <button class="complete-btn" title="Complete Task">&#10003;</button>
                    <button class="edit-btn" title="Edit Task">&#9998;</button>
                    <button class="delete-btn" title="Delete Task">&#128465;</button>
                </div>
            </div>
            <div class="task-details">
                ${task.description ? `<h4>Description</h4><p>${task.description}</p>` : ''}
                ${task.subtasks.length > 0 ? `<h4>Sub-tasks</h4><ul class="details-subtask-list">${subtasksHTML}</ul>` : ''}
            </div>
        `;
        taskList.appendChild(li);
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    const id = taskIdInput.value;
    const subtasksFromModal = Array.from(subtaskList.querySelectorAll('.subtask-item span')).map(span => ({
        text: span.textContent,
        completed: false
    }));
    const taskData = {
        id: id || Date.now().toString(),
        title: taskTitleInput.value,
        description: taskDescInput.value,
        dueDate: taskDueDateInput.value,
        completed: false,
        subtasks: subtasksFromModal
    };
    if (id) {
        const taskIndex = tasks.findIndex(t => t.id === id);
        taskData.completed = tasks[taskIndex].completed;
        const oldSubtasks = tasks[taskIndex].subtasks;
        taskData.subtasks.forEach(newSt => {
            const oldSt = oldSubtasks.find(os => os.text === newSt.text);
            if (oldSt) newSt.completed = oldSt.completed;
        });
        tasks[taskIndex] = taskData;
    } else {
        tasks.push(taskData);
    }
    saveAndRender();
    closeModal();
}

function handleTaskListClick(e) {
    const target = e.target;
    const taskItem = target.closest('.task-item');
    if (!taskItem) return;
    const taskId = taskItem.getAttribute('data-task-id');
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (target.matches('.complete-btn')) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        saveAndRender();
    } else if (target.matches('.edit-btn')) {
        openModal(tasks[taskIndex]);
    } else if (target.matches('.delete-btn')) {
        tasks.splice(taskIndex, 1);
        saveAndRender();
    } else if (target.matches('.details-subtask-list input[type="checkbox"]')) {
        const subtaskIndex = parseInt(target.getAttribute('data-subtask-index'));
        tasks[taskIndex].subtasks[subtaskIndex].completed = target.checked;
        saveAndRender();
    } else if (target.closest('.task-summary')) {
        taskItem.classList.toggle('open');
    }
}

function saveAndRender() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    // Save current sort preference
    localStorage.setItem('taskSortPreference', currentSort);
    renderTasks();
}

// --- Drag and Drop Logic ---
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = e.target;
    setTimeout(() => {
        e.target.classList.add('dragging');
    }, 0);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    // Update the `tasks` array to reflect the new manual order
    const reorderedTasks = [];
    taskList.querySelectorAll('.task-item').forEach(item => {
        const taskId = item.getAttribute('data-task-id');
        reorderedTasks.push(tasks.find(t => t.id === taskId));
    });
    tasks = reorderedTasks;
    saveAndRender(); // Save the new manual order
}

function handleDragOver(e) {
    e.preventDefault();
    const afterElement = getDragAfterElement(taskList, e.clientY);
    const currentlyDragged = document.querySelector('.dragging');
    
    // Clear previous drag-over class
    taskList.querySelectorAll('.task-item').forEach(item => item.classList.remove('drag-over'));

    if (afterElement == null) {
        taskList.appendChild(currentlyDragged);
    } else {
        taskList.insertBefore(currentlyDragged, afterElement);
        afterElement.classList.add('drag-over');
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}


// --- 4. EVENT LISTENERS ---
sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    saveAndRender();
});

taskList.addEventListener('click', handleTaskListClick);

// Add Drag and Drop Listeners
taskList.addEventListener('dragstart', handleDragStart);
taskList.addEventListener('dragend', handleDragEnd);
taskList.addEventListener('dragover', handleDragOver);


// Other listeners...
addTaskBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
taskForm.addEventListener('submit', handleFormSubmit);
addSubtaskBtn.addEventListener('click', () => {
    const text = subtaskInput.value.trim();
    if (text) {
        renderSubtaskInModal({ text: text, completed: false });
        subtaskInput.value = '';
        subtaskInput.focus();
    }
});
subtaskList.addEventListener('click', e => {
    if (e.target.matches('.remove-subtask-btn')) {
        e.target.closest('.subtask-item').remove();
    }
});

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    const savedTasks = localStorage.getItem('tasks');
    const savedSort = localStorage.getItem('taskSortPreference');
    if (savedTasks) tasks = JSON.parse(savedTasks);
    if (savedSort) {
        currentSort = savedSort;
        sortSelect.value = savedSort;
    }
    renderTasks();
});

// These functions are here for completeness but are unchanged
function openModal(task=null) {taskForm.reset(); subtaskList.innerHTML=''; if(task){taskIdInput.value=task.id; taskTitleInput.value=task.title; taskDescInput.value=task.description; taskDueDateInput.value=task.dueDate; task.subtasks.forEach(renderSubtaskInModal);}else{taskIdInput.value='';} modal.classList.remove('hidden');}
function closeModal() {modal.classList.add('hidden');}
function renderSubtaskInModal(subtask) {const li=document.createElement('li'); li.className='subtask-item'; li.innerHTML=`<span>${subtask.text}</span><button type="button" class="remove-subtask-btn">&times;</button>`; subtaskList.appendChild(li);}
function formatDate(dateString) {if(!dateString)return''; const options={year:'numeric',month:'short',day:'numeric'}; return new Date(dateString+'T00:00:00').toLocaleDateString(undefined, options);}