# Ozon parser
---------------
How to use
1. `git clone https://github.com/Jacute/ozon_parser_puppeteer`
2. `sudo apt install ca-certificates curl gnupg -y`
3. `sudo mkdir -p /etc/apt/keyrings && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg`
4. `echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_21.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list`
5. `sudo apt update && sudo apt install nodejs npm -y`
6. `npm i`
7. Move your credentials.json and input.json to parser directory.
8. node main.js
