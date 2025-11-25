import authService from '../services/authService.js';
import { formatDate, formatTime } from '../utils/helpers.js';

class ChatComponent {
    constructor() {
        this.messages = [];
        this.currentUser = authService.getCurrentUser();
    }

    render() {
        return `
      <div class="card mt-4">
        <div class="card__header">
          <h2 class="card__title">Chat del Grupo</h2>
        </div>
        <div class="card__body">
          <div id="chat-messages" class="chat-messages" style="height: 300px; overflow-y: auto; border: 1px solid #eee; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;">
            ${this.renderMessages()}
          </div>
          <form id="chat-form" class="flex gap-2">
            <input type="text" id="chat-input" class="form-control flex-1" placeholder="Escribe un mensaje..." required>
            <button type="submit" class="btn btn-primary">Enviar</button>
          </form>
        </div>
      </div>
    `;
    }

    renderMessages() {
        if (this.messages.length === 0) {
            return '<p class="text-muted text-center">No hay mensajes aún.</p>';
        }

        return this.messages.map(msg => `
      <div class="message ${msg.userId === this.currentUser.id ? 'message--own' : ''}" style="margin-bottom: 0.5rem; ${msg.userId === this.currentUser.id ? 'text-align: right;' : ''}">
        <div class="message__content" style="display: inline-block; background: ${msg.userId === this.currentUser.id ? '#007bff' : '#f1f1f1'}; color: ${msg.userId === this.currentUser.id ? 'white' : 'black'}; padding: 0.5rem 1rem; border-radius: 1rem;">
          <small class="block text-xs opacity-75">${msg.userName} - ${formatTime(msg.timestamp)}</small>
          <p class="m-0">${msg.text}</p>
        </div>
      </div>
    `).join('');
    }

    attachEvents() {
        const form = document.getElementById('chat-form');
        const input = document.getElementById('chat-input');
        const messagesContainer = document.getElementById('chat-messages');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = input.value.trim();
                if (text) {
                    this.addMessage(text);
                    input.value = '';
                    // Scroll to bottom
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            });
        }
    }

    addMessage(text) {
        const newMessage = {
            id: Date.now(),
            userId: this.currentUser.id,
            userName: this.currentUser.nombre,
            text: text,
            timestamp: new Date().toISOString()
        };

        this.messages.push(newMessage);
        this.updateMessages();
    }

    updateMessages() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = this.renderMessages();
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
}

export default new ChatComponent();
