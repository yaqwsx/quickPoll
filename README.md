# QuickPoll

Simple tool to collect real-time feedback from students

## Running Development Version

- create a Python virtual environment and install dependencies from
  `server/requirements.txt`
- install nginx
- create a file `server/instance/config.py` based on `config.py.template` in the
  same directory
- change the directory to `client` and run `npm install`
- start the client dev server by `npm run start`
- start the server by running `./runDev` in the root directory

Then you can access the application on `localhost:8888`. When you access it from
Firefox, you authenticate as `xstill`, if you access it from Chrome/Chromium you
authenticate as `xmrazek7`.

## Installation

### Server

The server is a Flask application designed to be used as uwsgi module. Setup a
virtual environment a the uwsgi module.

The server is expected to be served by Apache/Nginx. You have to expose
`/socket.io` endpoint and allow for websockets on this endpoint (see
`nginx.conf` for an example configuration).

Also, you are expected to provide authentication and provide the authenticated
username via `uwsgi_param AUTH_USER`.

### Client

The client is a React application. When you build the application, simply serve
it as static files via Apache/Nginx.

To build the application, go to the `client` directory:

- install dependencies by running `npm install`
- build the application: `npm run build`
- the resulting files are located in the `build` directory