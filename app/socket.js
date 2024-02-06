const socketIO = require('socket.io');
const OzonParser = require('./parser.js');

const { saveFile, readJson } = require('./utils.js');


function socketRun(server) {
    const io = socketIO(server);

    io.on('connection', (socket) => {
        console.log('User connected');

        socket.on('run', (credentials, input, tableId, sheetName) => {
            let parser;
            
            if (credentials) saveFile(process.env.CREDENTIALS_PATH, credentials);
            if (input) saveFile(process.env.INPUT_PATH, input);
            
            if (tableId && sheetName) {
                if (credentials && input) {
                    parser = new OzonParser(JSON.parse(credentials), JSON.parse(input), tableId, sheetName);
                } else {
                    credentials = readJson(process.env.CREDENTIALS_PATH);
                    input = readJson(process.env.INPUT_PATH);
                    parser = new OzonParser(credentials, input, tableId, sheetName);
                }

                parser.on('output', (output) => {
                    console.log(output);
                    socket.emit('output', output);
                });
    
                parser.start();
            } else {
                socket.emit('output', "Table Id and Sheet Name are required");
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
        
    });
}

module.exports = { socketRun };