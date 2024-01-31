const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const process = require('process');
const { executablePath } = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const fs = require('fs');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');


const EventEmitter = require('events');


class OzonParser extends EventEmitter {
    constructor(credentials=null, input=null) {
        super();
        this.hostname = 'https://www.ozon.ru/';
        this.credentials = credentials;
        this.input = input;
    }
    
    readJson(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const jsonContent = JSON.parse(data);
            return jsonContent;
        } catch (e) {
            console.error(e);
            return;
        }
    }
    
    getUrlsArray(urls) { 
        const result = [];
    
        for (const key in urls) {
            result.push(key);
            result.push(urls[key]);
        }
    
        return result;
    }
    
    formatData(originalArray) { // special table format
        const products = originalArray.map(item => item[0]);
        const prices = originalArray.map(item => item[1]);
      
        const formattedArray = [];
        for (let i = 0; i < products.length; i += 3) {
          formattedArray.push(products.slice(i, i + 3));
          formattedArray.push(prices.slice(i, i + 3));
        }
      
        return formattedArray;
    }
      
    
    async loadToGoogleSheet(data) {
        var credentialsData;
        if (this.credentials) {
            credentialsData = this.credentials;
        } else {
            credentialsData = this.readJson(process.env.CREDENTIALS_PATH);
        }
        
        const serviceAccountAuth = new JWT({
            email: credentialsData['client_email'],
            key: credentialsData['private_key'],
            scopes: [
              'https://www.googleapis.com/auth/spreadsheets',
            ],
        });
        
        const doc = new GoogleSpreadsheet(process.env.TABLE_ID, serviceAccountAuth);
        
        await doc.loadInfo();
    
        let sheet = doc.sheetsByTitle[process.env.SHEET_NAME];
        if (!sheet) sheet = await doc.addSheet({ title: process.env.SHEET_NAME }); // create sheet if not found
    
        await sheet.clear();
    
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
    
    async parse(browser) {
        var result = [];
        var urls;

        if (this.input) {
            urls = this.getUrlsArray(this.input[0]);
        } else {
            urls = this.getUrlsArray(this.readJson(process.env.INPUT_PATH)[0]);
        }
    
        const page = await browser.newPage()
        
        for (let i = 0; i < urls.length; i++) {
            this.emit('output', `Parsing ${i + 1} of ${urls.length}. URL: ${urls[i]}`)
    
            await page.goto(urls[i]);

            await page.waitForTimeout(2000);
            
            const button = await page.$('#reload-button'); // escape warning
            if (button) {
                await button.click();
                await page.waitForTimeout(2000);
            }

            let name = await page.$('h1');
            let [price] = await page.$x('//div/div[2]/div/div/span[contains(text(), "₽")][1]');
            
            if (!price) [price] = await page.$x('//div/div[1]/div/div/span[contains(text(), "₽")][1]');

            if (name && price) {
                const nameText = await page.evaluate(el => el.textContent, name);
                const priceText = await page.evaluate(el => el.textContent, price);

                result.push([nameText, priceText]);
            } else {
                this.emit('output', "Skip URL: " + urls[i]);
            }
        }
    
        await browser.close();

        return result;
        
    
    }

    async start() {
        require('dotenv').config();
        puppeteer.use(StealthPlugin());
        puppeteer.launch({ headless: (() => {
            if (process.env.HEADLESS === 'True') {
                return 'new';
            } else {
                return false;
            }
        })(), executablePath: executablePath() }).then(async browser => {
            this.emit('output', "=== START PARSING ===");
            var result = await this.parse(browser);
            this.emit('output', "=== END PARSING ===");

            result = this.formatData(result);

            this.emit('output', "=== LOAD RESULT ON GOOGLE SHEETS ===")
            try {
                this.loadToGoogleSheet(result);
                this.emit('output', "=== SUCCESS ===");
            } catch (err) {
                this.emit('output', "=== ERROR ===\n" + err);
            }

        });

    }
}


if (require.main === module) {
    require('dotenv').config();
    const parser = new OzonParser();

    parser.on('output', (output) => {
        console.log(output);
    });

    parser.start();
}

module.exports = OzonParser;
