document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const tasksContainer = document.getElementById('tasksContainer');
    const totalTasksElement = document.getElementById('totalTasks');
    const completedTasksElement = document.getElementById('completedTasks');
    const progressBar = document.getElementById('progressBar');
    const syncBtn = document.getElementById('syncBtn');
    const devsBtn = document.getElementById('devsBtn');
    const syncModal = document.getElementById('syncModal');
    const devsModal = document.getElementById('devsModal');
    const closeSyncModal = document.getElementById('closeSyncModal');
    const closeDevsModal = document.getElementById('closeDevsModal');
    const generateQRBtn = document.getElementById('generateQRBtn');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const qrCode = document.getElementById('qrCode');
    const jsonInput = document.getElementById('jsonInput');
    const importJsonBtn = document.getElementById('importJsonBtn');

    let tasks = loadTasks();
    let qrScanner = null;
    let isScannerRunning = false;

    renderTasks();
    updateStats();

    taskForm.addEventListener('submit', handleTaskSubmit);
    tasksContainer.addEventListener('change', handleTaskToggle);
    tasksContainer.addEventListener('click', handleTaskClick);

    syncBtn.addEventListener('click', () => openModal(syncModal));
    devsBtn.addEventListener('click', () => openModal(devsModal));
    closeSyncModal.addEventListener('click', () => closeModal(syncModal));
    closeDevsModal.addEventListener('click', () => closeModal(devsModal));
    generateQRBtn.addEventListener('click', handleGenerateQr);
    importJsonBtn.addEventListener('click', handleImportJson);

    function loadTasks() {
        try {
            const stored = JSON.parse(localStorage.getItem('tasks'));
            if (!Array.isArray(stored)) {
                return [];
            }
            return stored.filter(isValidTask);
        } catch (error) {
            console.warn('Failed to parse saved tasks', error);
            return [];
        }
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function handleTaskSubmit(event) {
        event.preventDefault();
        const taskText = taskInput.value.trim();
        if (!taskText) {
            return;
        }

        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false
        };

        tasks.unshift(newTask);
        saveTasks();
        renderTasks();
        updateStats();

        taskInput.value = '';
        taskInput.focus();

        const firstTask = tasksContainer.firstElementChild;
        if (firstTask) {
            firstTask.classList.add('animate-pulse');
            setTimeout(() => firstTask.classList.remove('animate-pulse'), 1000);
        }
    }

    function handleTaskToggle(event) {
        const checkbox = event.target;
        if (!checkbox.matches('input[type="checkbox"][data-id]')) {
            return;
        }

        const taskId = Number.parseInt(checkbox.dataset.id, 10);
        const task = tasks.find(item => item.id === taskId);
        if (!task) {
            return;
        }

        task.completed = checkbox.checked;
        saveTasks();
        updateStats();

        const taskElement = checkbox.closest('.task-item');
        const textSpan = taskElement ? taskElement.querySelector('span') : null;
        const iconContainer = checkbox.nextElementSibling;

        if (task.completed) {
            textSpan?.classList.add('text-gray-500', 'line-through', 'task-completed', 'active');
            iconContainer.innerHTML = '<i data-feather="check" class="w-4 h-4 text-white"></i>';
            feather.replace();
        } else {
            textSpan?.classList.remove('text-gray-500', 'line-through', 'task-completed', 'active');
            iconContainer.innerHTML = '';
        }
    }

    function handleTaskClick(event) {
        const deleteButton = event.target.closest('.delete-btn');
        if (!deleteButton) {
            return;
        }

        const taskId = Number.parseInt(deleteButton.dataset.id, 10);
        tasks = tasks.filter(task => task.id !== taskId);
        saveTasks();
        renderTasks();
        updateStats();
    }

    function renderTasks() {
        tasksContainer.innerHTML = '';

        if (tasks.length === 0) {
            tasksContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i data-feather="inbox" class="w-12 h-12 mx-auto mb-4"></i>
                    <p>Нет задач. Добавьте первую!</p>
                </div>
            `;
            feather.replace();
            return;
        }

        const fragment = document.createDocumentFragment();

        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item bg-gray-800 p-5 rounded-xl shadow-md flex items-center justify-between transition-all duration-300';
            taskElement.setAttribute('data-id', String(task.id));
            taskElement.innerHTML = `
                <div class="flex items-center space-x-4">
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} class="sr-only peer" data-id="${task.id}">
                        <div class="w-6 h-6 bg-gray-700 peer-checked:bg-primary-500 rounded-md flex items-center justify-center transition-colors peer-checked:ring-2 peer-checked:ring-primary-300">
                            ${task.completed ? '<i data-feather="check" class="w-4 h-4 text-white"></i>' : ''}
                        </div>
                    </label>
                    <span class="${task.completed ? 'text-gray-500 line-through task-completed active' : 'text-gray-200'}">${task.text}</span>
                </div>
                <button class="delete-btn text-gray-400 hover:text-red-400 transition-colors" data-id="${task.id}">
                    <i data-feather="trash-2"></i>
                </button>
            `;
            fragment.appendChild(taskElement);
        });

        tasksContainer.appendChild(fragment);
        feather.replace();
    }

    function updateStats() {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        totalTasksElement.textContent = String(totalTasks);
        completedTasksElement.textContent = String(completedTasks);
        progressBar.style.width = `${progress}%`;
    }

    function openModal(modal) {
        if (!modal.classList.contains('hidden')) {
            return;
        }

        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            modal.classList.add('show');
        });

        if (modal === syncModal) {
            // Give the modal time to finish the opening transition before starting the camera.
            setTimeout(startQrScanner, 320);
        }
    }

    function closeModal(modal) {
        if (modal.classList.contains('hidden')) {
            return;
        }

        modal.classList.add('opacity-0');
        modal.classList.remove('show');

        if (modal === syncModal) {
            stopQrScanner();
        }

        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }

    function handleGenerateQr(event) {
        event.preventDefault();
        if (!window.QRCode) {
            console.error('QR code library is not available');
            return;
        }

        const tasksJson = JSON.stringify(tasks);
        qrCodeContainer.classList.remove('hidden');
        qrCode.innerHTML = '';

        const canvas = document.createElement('canvas');
        qrCode.appendChild(canvas);

        QRCode.toCanvas(canvas, tasksJson, {
            width: 220,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        }, error => {
            if (error) {
                console.error('Failed to generate QR code', error);
            }
        });
    }

    function handleImportJson(event) {
        event.preventDefault();
        const rawValue = jsonInput.value.trim();
        if (!rawValue) {
            return;
        }

        try {
            const importedTasks = JSON.parse(rawValue);
            if (!Array.isArray(importedTasks) || !importedTasks.every(isValidTask)) {
                alert('Неверный формат задач');
                return;
            }

            tasks = importedTasks;
            saveTasks();
            renderTasks();
            updateStats();
            jsonInput.value = '';
            closeModal(syncModal);

            tasksContainer.classList.add('animate-pulse');
            setTimeout(() => tasksContainer.classList.remove('animate-pulse'), 1000);
        } catch (error) {
            alert('Ошибка при импорте данных: ' + error.message);
        }
    }

    function isValidTask(task) {
        return task && typeof task.id === 'number' && typeof task.text === 'string' && typeof task.completed === 'boolean';
    }

    function startQrScanner() {
        if (!window.Html5Qrcode) {
            console.warn('HTML5 QR code library is not available');
            return;
        }

        if (!qrScanner) {
            try {
                qrScanner = new Html5Qrcode('reader');
            } catch (error) {
                console.error('Failed to create QR scanner', error);
                return;
            }
        }

        if (isScannerRunning) {
            return;
        }

        qrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 250 },
            decodedText => {
                jsonInput.value = decodedText;
                stopQrScanner();
            },
            error => {
                console.warn('QR scan error', error);
            }
        ).then(() => {
            isScannerRunning = true;
        }).catch(error => {
            console.error('Failed to start QR scanner', error);
        });
    }

    function stopQrScanner() {
        if (!qrScanner || !isScannerRunning) {
            return;
        }

        qrScanner.stop().then(() => {
            isScannerRunning = false;
            qrScanner.clear();
        }).catch(error => {
            console.error('Failed to stop QR scanner', error);
            isScannerRunning = false;
        });
    }
});