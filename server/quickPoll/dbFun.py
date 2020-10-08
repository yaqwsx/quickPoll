from quickPoll.room import Room
from quickPoll.widgets import TextWidget, ChoiceWidget, Choice
import psycopg2.extras
import json

def createTables(db):
    try:
        cursor = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rooms (
                id VARCHAR(64) NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                author VARCHAR(64) NOT NULL,
                layout json NOT NULL
            );""")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS people (
                login VARCHAR(32) NOT NULL PRIMARY KEY,
                name TEXT,
                uco INTEGER
            );""")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS teachers (
                login VARCHAR(32) NOT NULL PRIMARY KEY
            );""")
    except Exception as e:
        db.rollback()
        raise
    else:
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
    try:
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
    except Exception as e:
        db.rollback()
        raise
    else:
        db.commit()

def deleteRoom(db, roomId):
    try:
        cursor = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cursor.execute("DELETE FROM rooms WHERE id = %s;", [roomId])
    except Exception as e:
        db.rollback()
        raise
    else:
        db.commit()

def memberInfo(db, members, activeMembers):
    """
    Collect information (real name, UČO teacher status) for given members
    """
    if len(members) == 0:
        return {}
    try:
        cursor = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cursor.execute("""
                SELECT * from people
            LEFT JOIN
                (SELECT login, True as teacher FROM teachers) as t
            USING (login)
            WHERE login in %s;""",
            [tuple(members)])
        return { x["login"]: {
                "uco": x["uco"],
                "name": x["name"],
                "teacher": bool(x["teacher"]),
                "active": x["login"] in activeMembers
            } for x in cursor }
    except Exception as e:
        db.rollback()
        raise
