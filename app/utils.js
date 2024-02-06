const fs = require('fs');


function saveFile(filepath, data) {
    fs.writeFile(filepath, data, (err) => {
        if (err) {
            console.error("Ошибка сохранения файла:", err);
        }
    });
}

function readJson(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const jsonContent = JSON.parse(data);
        return jsonContent;
    } catch (e) {
        console.error(e);
        return;
    }
}


module.exports = { readJson, saveFile };