const socketIO = require('socket.io');
const OzonParser = require('./parser.js');

const fs = require('fs');


function saveFile(filepath, data) {
    fs.writeFile(filepath, data, (err) => {
        if (err) {
            console.error("Ошибка сохранения файла:", err);
        }
    });
}


function socketRun(server) {
    const io = socketIO(server);

    io.on('connection', (socket) => {
        console.log('User connected');

        socket.on('run', (credentials, input) => {
            if (credentials) saveFile(process.env.CREDENTIALS_PATH, credentials);
            if (input) saveFile(process.env.INPUT_PATH, input);

            const parser = new OzonParser();

            parser.on('output', (output) => {
                socket.emit('output', output);
            });

            parser.start();
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
        
    });
}

module.exports = { socketRun };