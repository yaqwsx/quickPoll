from quickPoll.room import Room
from quickPoll.widgets import TextWidget, ChoiceWidget, Choice
import psycopg2.extras
import json

def createTables(db):
    cursor = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rooms (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            author VARCHAR(64) NOT NULL,
            layout json NOT NULL
        );""")
    db.commit()

def buildChoiceWidget(dict):
    w = ChoiceWidget(dict["name"], dict["multiple"],
        [Choice(x["text"]) for x in dict["choices"]])
    w.id = dict["id"]
    w.visible = dict["visible"]
    w.description = dict["description"]
    return w

def buildTextWidget(dict):
    w = TextWidget(dict["name"])
    w.id = dict["id"]
    w.visible = dict["visible"]
    w.description = dict["description"]
    return w

def buildRoom(dict):
    r = Room(dict["id"], dict["name"], dict["author"], dict["description"])
    for widgetLayout in dict["layout"]:
        if widgetLayout["type"] == "choice":
            w = buildChoiceWidget(widgetLayout)
        elif widgetLayout["type"] == "text":
            w = buildTextWidget(widgetLayout)
        else:
            raise RuntimeError("Unknow widget type " + widgetLayout["type"])
        r.addWidget(w)
    return r

def loadRooms(db):
    """
    Get all rooms
    """
    cursor = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cursor.execute("SELECT * from rooms")
    return [buildRoom(x) for x in cursor]

def updateRoom(db, room):
    """
    Update given room in database
    """
    l = room.teacherLayout()
    cursor = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cursor.execute("""
        INSERT INTO rooms (id, name, description, author, layout)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE
            SET name = excluded.name,
                description = excluded.description,
                author = excluded.author,
                layout = excluded.layout;
        """, [
            l["id"],
            l["name"],
            l["description"],
            l["author"],
            json.dumps(l["widgets"])
        ])
    db.commit()

def deleteRoom(db, roomId):
    cursor = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cursor.execute("DELETE FROM table_name WHERE id = %s;", [roomId])
    db.commit()
