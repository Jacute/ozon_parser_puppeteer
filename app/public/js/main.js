function processData() {
    const credentialsInput = document.getElementById('credentialsInput').value;
    const textInput = document.getElementById('textInput').value;
    const tableId = document.getElementById('tableId').value;
    const sheetName = document.getElementById('sheetName').value;

    if (credentialsInput && textInput && tableId && sheetName) {
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
    return [credentialsInput, textInput, tableId, sheetName];
}


const socket = io();

const form = document.getElementById('dataForm');
const messages = document.getElementById('messages');

socket.on('output', (output) => {
    const item = document.createElement('p');

    item.textContent = output;

    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    
})

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const inputs = processData();

    if (inputs) {
        const credentials = inputs[0];
        const text = inputs[1];
        const tableId = inputs[2];
        const sheetName = inputs[3];

        socket.emit('run', credentials, text, tableId, sheetName);
    }
});
