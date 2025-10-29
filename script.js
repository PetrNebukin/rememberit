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
    const scannerStatus = document.getElementById('scannerStatus');
    const toggleScanBtn = document.getElementById('toggleScanBtn');
    const readerContainer = document.getElementById('readerContainer');

    let tasks = loadTasks();
    let qrScanner = null;
    let isScannerRunning = false;
    const HTML5_QR_LIB_URL = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
    const SCAN_PROMPT = 'Нажмите «Запустить сканер», чтобы включить камеру.';
    let html5QrLoadPromise = null;
    const iconCache = new Map();

    hydrateStaticIcons();

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

    if (toggleScanBtn) {
        toggleScanBtn.addEventListener('click', handleToggleScan);
        setScanButtonState('idle');
    }

    resetScannerUi(SCAN_PROMPT);

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

    function updateScannerStatus(message, type = 'info') {
        if (!scannerStatus) {
            return;
        }

        scannerStatus.textContent = message;

        if (type === 'error') {
            scannerStatus.classList.add('text-red-400');
            scannerStatus.classList.remove('text-gray-400');
        } else {
            scannerStatus.classList.add('text-gray-400');
            scannerStatus.classList.remove('text-red-400');
        }
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
            iconContainer.innerHTML = getIcon('check', 16);
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

        const taskElement = deleteButton.closest('.task-item');
        if (taskElement) {
            taskElement.classList.add('will-remove');
            setTimeout(() => taskElement.remove(), 150);
        }

        if (tasks.length === 0) {
            renderTasks();
        }

        updateStats();
    }

    function renderTasks() {
        tasksContainer.innerHTML = '';

        if (tasks.length === 0) {
            tasksContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500" data-empty="true">
                    <div class="mx-auto mb-4 flex justify-center">${getIcon('inbox', 48)}</div>
                    <p>Нет задач. Добавьте первую!</p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

        tasks.forEach((task, index) => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item bg-gray-800 p-5 rounded-xl shadow-md flex items-center justify-between transition-all duration-300';
            taskElement.setAttribute('data-id', String(task.id));
            const checkboxIcon = task.completed ? getIcon('check', 16) : '';
            const taskTextClass = task.completed ? 'text-gray-500 line-through task-completed active' : 'text-gray-200';
            const deleteIcon = getIcon('trash-2', 18);
            taskElement.innerHTML = `
                <div class="flex items-center space-x-4">
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} class="sr-only peer" data-id="${task.id}">
                        <div class="w-6 h-6 bg-gray-700 peer-checked:bg-primary-500 rounded-md flex items-center justify-center transition-colors peer-checked:ring-2 peer-checked:ring-primary-300">
                            ${checkboxIcon}
                        </div>
                    </label>
                    <span class="${taskTextClass}">${task.text}</span>
                </div>
                <button class="delete-btn text-gray-400 hover:text-red-400 transition-colors" data-id="${task.id}" aria-label="Удалить задачу">
                    ${deleteIcon}
                </button>
            `;
            taskElement.style.setProperty('--task-delay', `${index * 90}ms`);
            fragment.appendChild(taskElement);
        });

        tasksContainer.appendChild(fragment);
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
            resetScannerUi(SCAN_PROMPT);
            // Re-enable hidden icons when modal opens
            requestAnimationFrame(() => {
                const icons = syncModal.querySelectorAll('svg.feather');
                icons.forEach(icon => {
                    if (icon.parentElement?.classList.contains('icon')) {
                        icon.style.display = '';
                    }
                });
            });
        }
    }

    function closeModal(modal) {
        if (modal.classList.contains('hidden')) {
            return;
        }

        modal.classList.add('opacity-0');
        modal.classList.remove('show');

        if (modal === syncModal) {
            stopQrScanner({ silent: true }).finally(() => {
                resetScannerUi('');
                // Clean up feather icons in modal to reduce paint cost
                const icons = syncModal.querySelectorAll('svg.feather');
                icons.forEach(icon => {
                    if (icon.parentElement?.classList.contains('icon')) {
                        icon.style.display = 'none';
                    }
                });
            });
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

    function handleToggleScan(event) {
        event.preventDefault();
        if (isScannerRunning) {
            stopQrScanner().catch(() => {
                updateScannerStatus('Не удалось корректно остановить сканер.', 'error');
            });
            return;
        }

        startQrScanner();
    }

    function setScanButtonState(state) {
        if (!toggleScanBtn) {
            return;
        }

        toggleScanBtn.dataset.state = state;
        toggleScanBtn.disabled = state === 'loading';

        let icon = 'camera';
        let label = 'Запустить сканер';

        if (state === 'active') {
            icon = 'x-circle';
            label = 'Остановить сканер';
        } else if (state === 'loading') {
            icon = 'loader';
            label = 'Запуск...';
        }

        toggleScanBtn.innerHTML = `${getIcon(icon, 18)}<span>${label}</span>`;
    }

    function showScannerViewport() {
        if (!readerContainer) {
            return;
        }

        readerContainer.classList.remove('hidden');
        requestAnimationFrame(() => readerContainer.classList.add('active'));
    }

    function hideScannerViewport(immediate = false) {
        if (!readerContainer) {
            return;
        }

        readerContainer.classList.remove('active');

        if (immediate) {
            readerContainer.classList.add('hidden');
            return;
        }

        setTimeout(() => {
            readerContainer.classList.add('hidden');
        }, 260);
    }

    function resetScannerUi(message = '') {
        setScanButtonState('idle');
        hideScannerViewport(true);
        updateScannerStatus(message || SCAN_PROMPT);
    }

    function startQrScanner() {
        setScanButtonState('loading');
        showScannerViewport();
        updateScannerStatus('Подготовка сканера...');

        return ensureQrLibLoaded().then(() => {
            if (!qrScanner) {
                try {
                    qrScanner = new Html5Qrcode('reader');
                } catch (error) {
                    console.error('Failed to create QR scanner', error);
                    setScanButtonState('idle');
                    hideScannerViewport();
                    updateScannerStatus('Не удалось инициализировать сканер.', 'error');
                    return;
                }
            }

            if (isScannerRunning) {
                setScanButtonState('active');
                updateScannerStatus('Наведите камеру на QR-код.');
                return;
            }

            if (!window.isSecureContext) {
                setScanButtonState('idle');
                hideScannerViewport();
                updateScannerStatus('Доступ к камере возможен только при открытии сайта по HTTPS или через localhost.', 'error');
                return;
            }

            if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
                setScanButtonState('idle');
                hideScannerViewport();
                updateScannerStatus('Ваш браузер не поддерживает доступ к камере.', 'error');
                return;
            }

            updateScannerStatus('Запрашиваем доступ к камере...');

            return qrScanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: 250 },
                decodedText => {
                    jsonInput.value = decodedText;
                    stopQrScanner({ silent: true }).finally(() => {
                        setScanButtonState('idle');
                        hideScannerViewport();
                        updateScannerStatus('QR-код считан. Данные перенесены в поле.', 'info');
                    });
                },
                error => {
                    console.warn('QR scan error', error);
                }
            ).then(() => {
                isScannerRunning = true;
                setScanButtonState('active');
                updateScannerStatus('Наведите камеру на QR-код.');
            }).catch(error => {
                console.error('Failed to start QR scanner', error);
                const errorMessage = typeof error === 'string' ? error : error?.message || 'Неизвестная ошибка';
                setScanButtonState('idle');
                hideScannerViewport();
                updateScannerStatus(`Не удалось запустить камеру: ${errorMessage}`, 'error');
            });
        }).catch(error => {
            console.error('Failed to load HTML5 QR code library', error);
            const errorMessage = typeof error === 'string' ? error : error?.message || 'неизвестная ошибка';
            setScanButtonState('idle');
            hideScannerViewport();
            updateScannerStatus(`Библиотека сканера не загрузилась: ${errorMessage}`, 'error');
        });
    }

    function stopQrScanner(options = {}) {
        const { silent = false } = options;

        if (!qrScanner || !isScannerRunning) {
            hideScannerViewport();
            setScanButtonState('idle');
            if (!silent) {
                updateScannerStatus(SCAN_PROMPT);
            }
            return Promise.resolve();
        }

        setScanButtonState('loading');

        return qrScanner.stop().then(() => {
            isScannerRunning = false;
            try {
                qrScanner.clear();
            } catch (error) {
                console.warn('Failed to clear QR scanner', error);
            }
        }).catch(error => {
            console.error('Failed to stop QR scanner', error);
            isScannerRunning = false;
            if (!silent) {
                updateScannerStatus('Не удалось корректно остановить сканер.', 'error');
            }
        }).finally(() => {
            hideScannerViewport();
            setScanButtonState('idle');
            if (!silent && !isScannerRunning) {
                updateScannerStatus(SCAN_PROMPT);
            }
        });
    }

    function hydrateStaticIcons() {
        if (!window.feather || !feather.icons) {
            setTimeout(hydrateStaticIcons, 60);
            return;
        }

        const placeholders = document.querySelectorAll('.icon[data-icon]');
        placeholders.forEach(node => {
            const iconName = node.dataset.icon;
            const size = Number.parseInt(node.dataset.size || '18', 10);
            node.innerHTML = getIcon(iconName, size);
        });
    }

    function getIcon(name, size = 18, strokeWidth = 1.8) {
        if (!window.feather || !feather.icons?.[name]) {
            return '';
        }

        const cacheKey = `${name}-${size}-${strokeWidth}`;
        if (iconCache.has(cacheKey)) {
            return iconCache.get(cacheKey);
        }

        const svg = feather.icons[name].toSvg({ width: size, height: size, 'stroke-width': strokeWidth });
        iconCache.set(cacheKey, svg);
        return svg;
    }

    function ensureQrLibLoaded() {
        if (window.Html5Qrcode) {
            return Promise.resolve();
        }

        if (html5QrLoadPromise) {
            return html5QrLoadPromise;
        }

        html5QrLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = HTML5_QR_LIB_URL;
            script.async = true;
            script.onload = () => {
                if (window.Html5Qrcode) {
                    resolve();
                } else {
                    reject(new Error('Html5Qrcode не определен после загрузки.'));
                }
            };
            script.onerror = () => reject(new Error('Не удалось загрузить скрипт по адресу ' + HTML5_QR_LIB_URL));
            document.head.appendChild(script);
        }).finally(() => {
            setTimeout(() => {
                html5QrLoadPromise = null;
            }, 1000);
        });

        return html5QrLoadPromise;
    }
});