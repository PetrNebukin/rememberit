class TaskItem extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const task = JSON.parse(this.getAttribute('data-task'));
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: #1f2937;
                    padding: 1.25rem;
                    border-radius: 0.75rem;
                    margin-bottom: 1rem;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                
                :host(:hover) {
                    transform: translateX(4px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
                }
                
                .task-container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .task-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .checkbox {
                    width: 1.5rem;
                    height: 1.5rem;
                    background-color: #374151;
                    border-radius: 0.375rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                
                .checkbox.checked {
                    background-color: #8b5cf6;
                }
                
                .task-text {
                    color: #f3f4f6;
                    font-size: 1rem;
                }
                
                .task-text.completed {
                    color: #9ca3af;
                    text-decoration: line-through;
                }
                
                .delete-btn {
                    color: #9ca3af;
                    transition: color 0.2s ease;
                    cursor: pointer;
                }
                
                .delete-btn:hover {
                    color: #f87171;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                :host {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            </style>
            <div class="task-container">
                <div class="task-content">
                    <div class="checkbox ${task.completed ? 'checked' : ''}">
                        ${task.completed ? '<i data-feather="check" class="w-4 h-4 text-white"></i>' : ''}
                    </div>
                    <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                </div>
                <div class="delete-btn">
                    <i data-feather="trash-2"></i>
                </div>
            </div>
        `;
        
        // Initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Add event listeners
        const checkbox = this.shadowRoot.querySelector('.checkbox');
        checkbox.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('taskToggled', {
                bubbles: true,
                composed: true,
                detail: { taskId: task.id }
            }));
        });
        
        const deleteBtn = this.shadowRoot.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('taskDeleted', {
                bubbles: true,
                composed: true,
                detail: { taskId: task.id }
            }));
        });
    }
}

customElements.define('task-item', TaskItem);