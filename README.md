## Running the server

1) Edit server/process.json according to your environment
2) Launch the app from the Terminal:

    $ npm install npm@latest -g
    $ npm install pm2 -g
    $ npm install 
    $ export NODE_ENV=production
    $ pm2 start server/process.json

3) To start on boot, let pm2 handle it:

    $ sudo pm2 startup
    $ pm2 save
    
4) You probably want to rotate logs, too:

    $ pm2 install pm2-logrotate
    $ sudo pm2 logrotate -u user
    
5) Now login via the website, change your password, and generate some API keys
6) Grab your API keys and drop them in the PagerMon client, then you're good to go!