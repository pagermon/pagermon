#! /bin/sh.
sudo apt purge nodejs -y
sudo apt install -y ca-certificates curl gnupg
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/nodesource.gpg
NODE_MAJOR=18
NODE_MAJOR=20
echo "deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt update
sudo apt install nodejs build-essential npm sqlite3
npm install npm@latest -g
npm install pm2 -g
npm install
export NODE_ENV=production

echo"Install complete"
echo"Copy process-default.json to process.json and modify according to your environment"
echo"once done run  sudo pm2 start process.json to start process""
