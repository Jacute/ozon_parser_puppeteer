function processData() {
    const credentialsInput = document.getElementById('credentialsInput').value;
    const textInput = document.getElementById('textInput').value;

    if (credentialsInput && textInput) {
        try {
            JSON.parse(credentialsInput);
            JSON.parse(textInput);
        } catch (e) {
            console.error('Error! ' + e);
            return null;
        }
    }
    credentialsInput.value = '';
    textInput.value = ''
    return [credentialsInput, textInput];
}


const socket = io();

const form = document.getElementById('dataForm');
const messages = document.getElementById('messages');

socket.on('output', (output) => {
    const item = document.createElement('p');

    item.textContent = output;

    messages.appendChild(item);
    
})

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const inputs = processData();

    if (inputs) {
        const credentials = inputs[0];
        const text = inputs[1];
        socket.emit('run', credentials, text);
    }
});
