from flask import Flask
from flask_socketio import SocketIO
import psycopg2
from quickPoll.dbFun import createTables

app = Flask(__name__, instance_relative_config=True)
app.config.from_pyfile('config.py')
socketio = SocketIO(app)

db = psycopg2.connect(**app.config["DB_CONNECTION"])
createTables(db)

import quickPoll.main

if __name__ == '__main__':
    socketio.run(app)
