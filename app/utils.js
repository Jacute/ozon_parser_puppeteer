const fs = require('fs');


function saveFile(filepath, data) {
    fs.writeFile(filepath, data, (err) => {
        if (err) {
            console.error("Ошибка сохранения файла:", err);
        }
    });
}

function readFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data;
    } catch (e) {
        console.error(e);
        return;
    }
}

function fileExists(filePath) {
    if (fs.existsSync(filePath)) {
        return true;
    }
    return false;
}

module.exports = { readFile, saveFile, fileExists };