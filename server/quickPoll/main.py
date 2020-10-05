from quickPoll import app, socketio, db

from flask import request
from flask_socketio import join_room, leave_room, close_room

from quickPoll.room import Room, RoomSuite
from quickPoll.widgets import ChoiceWidget, TextWidget, Choice
import quickPoll.dbFun as dbFun

def addDemoRoom(suite):
    # Initialize single demonstration room
    room = suite.addRoom("demo")
    room.name = "Demonstrační místnost"
    room.description = "Zde může být sofistikovaný popisek místnosti"

    room.author = "system"
    w1 = room.addWidget(ChoiceWidget("Zadej možnost v single-choice widgetu", False, [
        Choice("Možnost 1"),
        Choice("Možnost 2"),
    ]))
    w1.visible = True
    w1.description = "Volitelný, sofistikovaný popis otázky"

    w2 = room.addWidget(TextWidget("Chceš nám něco vzkázat skrze textový vstup?"))
    w2.visible = True
    w2.description = "Neboj se být upřímný v tomto volitelném popisku otázky"

    w3 = room.addWidget(ChoiceWidget("Zadej možnost v multiple-choice widgetu", True, [
        Choice("Možnost 1"),
        Choice("Možnost 2"),
        Choice("Možnost 3"),
    ]))
    w3.visible = True
    return room

roomSuite = RoomSuite()
for room in dbFun.loadRooms(db):
    roomSuite.addExistingRoom(room)
if not roomSuite.hasRoom("demo"):
    r = addDemoRoom(roomSuite)
    dbFun.updateRoom(db, r)

def isTeacher(username):
    return username in app.config["TEACHERS"]

@socketio.on("disconnect")
def disconnect():
    def onLeave(room):
        leave_room("student:room." + room.id)
        updateRoomOverview(room)
    roomSuite.leave(request.sid, onLeave=onLeave)
    updateRoomsOverview()

@socketio.on("joinRoom")
def joinRoom(roomId):
    roomId = str(roomId)
    username = request.environ["AUTH_USER"]

    if not roomSuite.hasRoom(roomId):
        return {
            "status": "error",
            "reason": "noSuchRoom"
        }

    room = roomSuite.getRoom(roomId)

    existingSession = room.getMemberSession(username)
    if existingSession is not None and existingSession != request.sid:
        return {
            "status": "error",
            "reason": "alreadyJoined"
        }

    room.join(username, request.sid)
    join_room("student:room." + room.id)
    updateRoomsOverview()
    updateRoomOverview(room)
    return {
        "status": "success",
        "roomLayout": room.studentLayout(),
        "answers": room.getMemberAnswers(username)
    }

@socketio.on("forceJoinRoom")
def forceJoinRoom(roomId):
    roomId = str(roomId)
    username = request.environ["AUTH_USER"]

    if not roomSuite.hasRoom(roomId):
        return {
            "status": "error",
            "reason": "noSuchRoom"
        }
    room = roomSuite.getRoom(roomId)

    existingSession = room.getMemberSession(username)
    if existingSession is not None and existingSession != request.sid:
        # Disconnect the existing connection
        socketio.emit("roomUpdate", {
            "status": "error",
            "reason": "alreadyJoined"
        })
        room.leave(existingSession)

    room.join(username, request.sid)
    return {
        "status": "success",
        "roomLayout": room.studentLayout(),
        "answers": room.getMemberAnswers(username)
    }

@socketio.on("answerUpdate")
def answerUpdate(roomId, answers):
    roomId = str(roomId)
    username = request.environ["AUTH_USER"]
    if not roomSuite.hasRoom(roomId):
        return
    room = roomSuite.getRoom(roomId)
    existingSession = room.getMemberSession(username)
    if existingSession != request.sid:
        return
    room.updateAnswers(username, answers)
    updateRoomOverview(room)

def roomsOverview(roomSuite):
    return [{
        "id": id,
        "name": room.name,
        "author": room.author,
        "activeMembers": len(room.memberSessions)
    } for id, room in roomSuite.rooms.items()]

def updateRoomsOverview():
    socketio.emit("rooms", roomsOverview(roomSuite), room="teacher:roomsOverview")

@socketio.on("subscribeRooms")
def subscribeRooms():
    username = request.environ["AUTH_USER"]
    if not isTeacher(username):
        return
    join_room("teacher:roomsOverview")
    return roomsOverview(roomSuite)

@socketio.on("unsubscribeRooms")
def unsubscribeRooms():
    username = request.environ["AUTH_USER"]
    if not isTeacher(username):
        return
    leave_room("teacher:roomsOverview")

def roomOverview(room):
    return {
        "status": "success",
        "roomLayout": room.teacherLayout(),
        "answers": room.getMembersAnswers()
    }

def updateRoomLayout(room):
    overview = roomOverview(room)
    socketio.emit("room", overview, room="teacher:room." + room.id)
    layout = room.studentLayout()
    for username, sid in room.memberSessions.items():
        socketio.emit("roomUpdate", {
            "status": "success",
            "roomLayout": layout,
            "answers": room.getMemberAnswers(username)
        }, sid=sid)

def updateRoomOverview(room):
    overview = roomOverview(room)
    socketio.emit("room", overview, room="teacher:room." + room.id)

@socketio.on("subscribeRoom")
def subscribeRoom(roomId):
    roomId = str(roomId)
    username = request.environ["AUTH_USER"]
    if not isTeacher(username):
        return
    if not roomSuite.hasRoom(roomId):
        return {
            "status": "error",
            "reason": "noSuchRoom"
        }
    room = roomSuite.getRoom(roomId)
    join_room("teacher:room." + room.id)
    return roomOverview(room)

@socketio.on("unsubscribeRoom")
def unsubscribeRoom(roomId):
    username = request.environ["AUTH_USER"]
    if not isTeacher(username):
        return
    if not roomSuite.hasRoom(roomId):
        return
    leave_room("teacher:room." + roomId)

@socketio.on("deleteRoom")
def deleteRoom(roomId):
    username = request.environ["AUTH_USER"]
    if not isTeacher(username):
        return
    if not roomSuite.hasRoom(roomId):
        return
    roomSuite.deleteRoom(roomId)
    dbFun.deleteRoom(db, roomId)

    socketio.emit("room", {
            "status": "error",
            "reason": "noSuchRoom"
        }, room="teacher:room." + roomId)
    socketio.close_room("teacher:room." + roomId)
    socketio.emit("room", {
            "status": "error",
            "reason": "noSuchRoom"
        }, room="student:room." + roomId)
    socketio.close_room("student:room." + roomId)
    updateRoomsOverview()

@socketio.on("createRoom")
def createRoom():
    username = request.environ["AUTH_USER"]
    if not isTeacher(username):
        return
    room = roomSuite.addRoom(author=username)
    dbFun.updateRoom(db, room)
    updateRoomsOverview()
    return room.id

@socketio.on("reorderWidgets")
def reorderWidgets(roomId, widgetsId):
    username = request.environ["AUTH_USER"]
    if not isTeacher(username):
        return
    if not roomSuite.hasRoom(roomId):
        return
    room = roomSuite.getRoom(roomId)
    if len(widgetsId) != len(room.widgets) or any([w.id not in widgetsId for w in room.widgets]):
        return

    room.reorderWidgets(widgetsId)
    dbFun.updateRoom(db, room)
    updateRoomLayout(room)
    return roomOverview(room)

@socketio.on("deleteWidget")
def deleteWidget(roomId, widgetId):
    username = request.environ["AUTH_USER"]
    if not isTeacher(username):
        return
    if not roomSuite.hasRoom(roomId):
        return
    room = roomSuite.getRoom(roomId)
    room.deleteWidget(widgetId)
    dbFun.updateRoom(db, room)
    updateRoomLayout(room)
    return roomOverview(room)

@socketio.on("addWidget")
def addWidget(roomId, type):
    username = request.environ["AUTH_USER"]
    if not isTeacher(username):
        return
    if not roomSuite.hasRoom(roomId):
        return
    room = roomSuite.getRoom(roomId)

    if type == "text":
        room.addWidget(TextWidget("Nová textová otázka"))
    elif type == "choice":
        room.addWidget(ChoiceWidget("Nová výběrová otázka", False, []))
    else:
        return
    dbFun.updateRoom(db, room)
    updateRoomLayout(room)
    return roomOverview(room)

@socketio.on("changeRoomName")
def changeRoomName(roomId, name):
    return changeRoomPropertyHandler(request, roomId, "name", name)

@socketio.on("changeRoomDescription")
def changeRoomName(roomId, description):
    return changeRoomPropertyHandler(request, roomId, "description", description)

def changeRoomPropertyHandler(request, roomId, propertyName, propertyValue):
    username = request.environ["AUTH_USER"]
    if not isTeacher(username):
        return
    if not roomSuite.hasRoom(roomId):
        return
    room = roomSuite.getRoom(roomId)
    setattr(room, propertyName, propertyValue)
    dbFun.updateRoom(db, room)
    updateRoomLayout(room)
    return roomOverview(room)

def changeWidgetPropertyHandler(request, roomId, widgetId, propertyName, propertyValue):
    username = request.environ["AUTH_USER"]
    if not isTeacher(username):
        return
    if not roomSuite.hasRoom(roomId):
        return
    room = roomSuite.getRoom(roomId)
    widget = room.widget(widgetId)
    if widget is None:
        return
    setattr(widget, propertyName, propertyValue)
    dbFun.updateRoom(db, room)
    updateRoomLayout(room)
    return roomOverview(room)

@socketio.on("changeWidgetName")
def changeWidgetName(roomId, widgetId, name):
    return changeWidgetPropertyHandler(request, roomId, widgetId, "name", name)

@socketio.on("changeWidgetDescription")
def changeWidgetDescription(roomId, widgetId, description):
    return changeWidgetPropertyHandler(request, roomId, widgetId, "description", description)

@socketio.on("changeWidgetVisibility")
def changeWidgetVisibility(roomId, widgetId, visible):
    return changeWidgetPropertyHandler(request, roomId, widgetId, "visible", visible)

@socketio.on("changeWidgetMultipleChoice")
def changeWidgetMultipleChoice(roomId, widgetId, multiple):
    return changeWidgetPropertyHandler(request, roomId, widgetId, "multiple", multiple)

def validateForChoice(request, roomId, widgetId, choiceId):
    """
    Validates requests and returns given room, widget and choice if eligible,
    None otherwise
    """
    username = request.environ["AUTH_USER"]
    if not isTeacher(username):
        return None, None, None
    if not roomSuite.hasRoom(roomId):
        return None, None, None
    room = roomSuite.getRoom(roomId)
    widget = room.widget(widgetId)
    if widget is None or widget.type() != "choice":
        return None, None, None
    return room, widget, widget.choice(choiceId)


@socketio.on("deleteChoice")
def deleteChoice(roomId, widgetId, choiceId):
    room, widget, choice = validateForChoice(request, roomId, widgetId, choiceId)
    if room is None or widget is None or choice is None:
        return
    widget.deleteChoice(choiceId)
    dbFun.updateRoom(db, room)
    updateRoomLayout(room)
    return roomOverview(room)

@socketio.on("changeChoice")
def deleteChoice(roomId, widgetId, choiceId, value):
    room, widget, choice = validateForChoice(request, roomId, widgetId, choiceId)
    if room is None or widget is None or choice is None:
        return
    choice.text = value
    dbFun.updateRoom(db, room)
    updateRoomLayout(room)
    return roomOverview(room)

@socketio.on("addChoice")
def deleteChoice(roomId, widgetId):
    room, widget, choice = validateForChoice(request, roomId, widgetId, None)
    if room is None or widget is None:
        return
    widget.addChoice(Choice(""))
    dbFun.updateRoom(db, room)
    updateRoomLayout(room)
    return roomOverview(room)

@socketio.on("reorderChoices")
def deleteChoice(roomId, widgetId, choicesIds):
    room, widget, choice = validateForChoice(request, roomId, widgetId, None)
    if room is None or widget is None:
        return
    if len(choicesIds) != len(widget.choices) or any([ch.id not in choicesIds for ch in widget.choices]):
        return

    widget.reorderChoices(choicesIds)
    dbFun.updateRoom(db, room)
    updateRoomLayout(room)
    return roomOverview(room)

@socketio.on("whoAmI")
def whoAmI():
    username = request.environ["AUTH_USER"]
    roles = ["student"]
    if username in app.config["TEACHERS"]:
        roles.append("teacher")
    return roles