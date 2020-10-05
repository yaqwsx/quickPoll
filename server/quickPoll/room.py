from random_words import RandomWords

class Room:
    def __init__(self, id, name="", author="", description=""):
        self.id = id
        self.name = name
        self.description = description
        self.author = author
        self.widgets = []
        self.widgetIdCounter = 0
        self.memberSessions = {}
        self.memberAnswers = {}

    def widget(self, id):
        for w in self.widgets:
            if w.id == id:
                return w
        return None

    def addWidget(self, widget):
        self.widgetIdCounter += 1
        widget.id = self.widgetIdCounter
        self.widgets.append(widget)
        return self.widgets[-1]

    def deleteWidget(self, id):
        for i, w in enumerate(self.widgets):
            if w.id == id:
                del self.widgets[i]
                return

    def reorderWidgets(self, widgetIdList):
        widgetDict = {w.id: w for w in self.widgets}
        self.widgets = list([widgetDict[wId] for wId in widgetIdList])

    def getMemberSession(self, username):
        return self.memberSessions.get(username, None)

    def join(self, username, sessionId):
        self.memberSessions[username] = sessionId

    def leave(self, sessionId):
        for username, session in self.memberSessions.items():
            if session != sessionId:
                continue
            del self.memberSessions[username]
            return True
        return False

    def pruneAnswers(self, answers):
        """
        Remove answers that do not match the current layout
        """
        prunedAnswers = {}
        for widget in self.widgets:
            strId = str(widget.id)
            if strId not in answers.keys():
                continue
            if widget.isValidAnswer(answers[strId]):
                prunedAnswers[widget.id] = answers[strId]
        return prunedAnswers

    def updateAnswers(self, username, answers):
        self.memberAnswers[username] = self.pruneAnswers(answers)

    def studentLayout(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "widgets": list([x.layout() for x in self.widgets if x.visible])
        }

    def teacherLayout(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "author": self.author,
            "widgets": list([x.layout() for x in self.widgets])
        }

    def getMemberAnswers(self, username):
        if username not in self.memberAnswers:
            return {}
        return self.memberAnswers[username]

    def getMembersAnswers(self):
        return { username: self.getMemberAnswers(username) for username in self.memberSessions.keys()}

class RoomSuite:
    def __init__(self):
        self.rooms = {}
        self.wordsGenerator = RandomWords()

    def generateId(self):
        idWords = [self.wordsGenerator.random_word() for _ in range(3)]
        idString = "".join([x.capitalize() for x in idWords])
        if idString in self.rooms.keys():
            return self.generateId()
        return idString

    def addExistingRoom(self, room):
        self.rooms[room.id] = room

    def addRoom(self, id=None, **kwargs):
        if id is None:
            id = self.generateId()
        self.rooms[id] = Room(id, **kwargs)
        return self.rooms[id]

    def hasRoom(self, id):
        return id in self.rooms.keys()

    def getRoom(self, id):
        return self.rooms[id]

    def leave(self, sessionId, onLeave=None):
        for room in self.rooms.values():
            if room.leave(sessionId) and onLeave is not None:
                onLeave(room)

    def deleteRoom(self, roomId):
        if roomId not in self.rooms:
            return
        del self.rooms[roomId]
