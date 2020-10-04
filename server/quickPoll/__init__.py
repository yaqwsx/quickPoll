from flask import Flask
from flask_socketio import SocketIO

app = Flask(__name__, instance_relative_config=True)
app.config.from_pyfile('config.py')
socketio = SocketIO(app)

import quickPoll.main

if __name__ == '__main__':
    socketio.run(app)