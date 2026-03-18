// assistant.js
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('assistant-input');
    const sendButton = document.getElementById('send-button');
    const micButton = document.getElementById('mic-button');

    // Focus input on load
    input.focus();

    // Re-focus anytime window regains focus
    window.addEventListener('focus', () => {
        input.focus();
    });

    function sendInput() {
        const text = input.value.trim();
        if (text) {
            // Send text to main process
            ipcRenderer.send('assistant-save-input', text);
            input.value = ''; // clear input
            
            // Optionally close or hide the assistant window after send
            ipcRenderer.send('assistant-hide');
        }
    }

    // Send on Enter key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendInput();
        }
        // Hide on Escape
        if (e.key === 'Escape') {
            ipcRenderer.send('assistant-hide');
        }
    });

    // Send on click
    sendButton.addEventListener('click', sendInput);

    // Placeholder for Mic Logic
    micButton.addEventListener('click', () => {
        // Basic speech recognition via Web Speech API (if supported)
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'es-ES'; // Default Spanish
            recognition.interimResults = false;
            
            micButton.style.color = '#ffeb64'; // Indicate active
            input.placeholder = "Escuchando...";

            recognition.onresult = (event) => {
                const speechResult = event.results[0][0].transcript;
                input.value = speechResult;
                micButton.style.color = '';
                input.placeholder = "Pregúntale algo a Lemon...";
                sendInput(); // Auto send after recognition
            };

            recognition.onerror = () => {
                micButton.style.color = '';
                input.placeholder = "Error al escuchar...";
                setTimeout(() => input.placeholder = "Pregúntale algo a Lemon...", 2000);
            };

            recognition.onend = () => {
                micButton.style.color = '';
                input.placeholder = "Pregúntale algo a Lemon...";
            }

            recognition.start();
        } else {
            alert('El reconocimiento de voz no está soportado en este entorno.');
        }
    });
});
