const Koa = require('koa');
const views = require('koa-views');
const static = require('koa-static');
const app = new Koa();
const router = require('./routes.js');

const path = require('path');

const { socketRun } = require('./socket.js');

const http = require('http');
const server = http.createServer(app.callback());
socketRun(server);

app.use(static(path.join(__dirname, 'public')));
app.use(views(path.join(__dirname, 'views'), { extension: 'html' }));
app.use(router.routes());
app.use(router.allowedMethods());

require('dotenv').config();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, (err) => {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log(`Server listening on http://${HOST}:${PORT}`);
    }
});
