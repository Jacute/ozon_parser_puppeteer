const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const process = require('process');
const { executablePath } = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

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

function getUrlsArray(urls) { 
    const result = [];

    for (const key in urls) {
        result.push(key);
        result.push(urls[key]);
    }

    return result;
}

function formatData(originalArray) {
    // Разделение массива на два списка (товары и цены)
    const products = originalArray.map(item => item[0]);
    const prices = originalArray.map(item => item[1]);
  
    // Формирование нового массива
    const formattedArray = [];
    for (let i = 0; i < products.length; i += 3) {
      formattedArray.push(products.slice(i, i + 3));
      formattedArray.push(prices.slice(i, i + 3));
    }
  
    return formattedArray;
}
  

async function loadToGoogleSheet(data) {
    const credentialsData = readJson(process.env.CREDENTIALS_PATH);

    const serviceAccountAuth = new JWT({
        email: credentialsData['client_email'],
        key: credentialsData['private_key'],
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
        ],
    });
    
    const doc = new GoogleSpreadsheet(process.env.TABLE_ID, serviceAccountAuth);
    
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle[process.env.SHEET_NAME]; // or use `doc.sheetsById[id]` or `doc.sheetsByTitle[title]`

    await sheet.loadCells(`A1:C${data.length}`);
    for (let i = 0; i < data.length; i++) {
        let cellA = sheet.getCell(i, 0);
        let cellB = sheet.getCell(i, 1);
        let cellC = sheet.getCell(i, 2);

        cellA.value = data[i][0];
        cellB.value = data[i][1];
        cellC.value = data[i][2];
    }
    await sheet.saveUpdatedCells();

}

async function start(browser) {
    var result = [];

    const urls = getUrlsArray(readJson(process.env.INPUT_PATH)[0]);

    const page = await browser.newPage()

    await page.goto(hostname);
    await page.waitForTimeout(10000);

    const button = await page.$('#reload-button'); // escape warning
    if (button) {
        await button.click();
        await page.waitForTimeout(2000);
    }
    
    for (let i = 0; i < urls.length; i++) {
        console.log(`Parsing ${i + 1} of ${urls.length}. URL: ${urls[i]}`)

        await page.goto(urls[i]);

        const name = await page.$('h1');
        const price = await page.$('.m9l');

        if (name && price) {
            const nameText = await page.evaluate(el => el.textContent, name);
            const priceText = await page.evaluate(el => el.textContent, price);

            result.push([nameText, priceText]);
        } else {
            console.error("Skipping URL: " + urls[i]);
        }
    }

    await browser.close();

    return result;
    

}


require('dotenv').config();
const hostname = 'https://www.ozon.ru/';
puppeteer.use(StealthPlugin());
puppeteer.launch({ headless: process.env.HEADLESS === 'True', executablePath: executablePath() }).then(async browser => {
    console.log("=== START PARSING ===");
    var result = await start(browser);
    console.log("=== END PARSING ===");

    result = formatData(result);

    console.log("=== LOAD RESULT ON GOOGLE SHEETS ===")
    try {
        loadToGoogleSheet(result);
        console.log("=== SUCCESS ===");
    } catch (err) {
        console.log("=== ERROR ===\n" + err);
    }

});
