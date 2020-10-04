
class Widget:
    def __init__(self, name):
        self.id = None
        self.name = name
        self.description = ""
        self.visible = False

    def layout(self):
        """
        Return layout of the widget as dictionary
        """
        return {
            "name": self.name,
            "id": self.id,
            "visible": self.visible,
            "type": self.type(),
            "description": self.description,
        }

class Choice:
    def __init__(self, text):
        self.id = None
        self.text = text

    def layout(self):
        return {
            "id": self.id,
            "text": self.text,
        }

class ChoiceWidget(Widget):
    def __init__(self, name, multiple, choices):
        super().__init__(name)
        self.choiceIdCounter = 0
        self.choices = []
        for choice in choices:
            self.addChoice(choice)
        self.multiple = multiple

    def choice(self, choiceId):
        for ch in self.choices:
            if ch.id == choiceId:
                return ch
        return None

    def addChoice(self, choice):
        self.choiceIdCounter += 1
        choice.id = self.choiceIdCounter
        self.choices.append(choice)

    def reorderChoices(self, choicesIdList):
        choicesDict = {ch.id: ch for ch in self.choices}
        self.choices = list([choicesDict[chId] for chId in choicesIdList])

    def deleteChoice(self, choiceId):
        self.choices = list([ch for ch in self.choices if ch.id != choiceId])

    def type(self):
        return "choice"

    def layout(self):
        layout = super().layout()
        layout.update({
            "choices": [x.layout() for x in self.choices],
            "multiple": self.multiple
        })
        return layout

    def isValidAnswer(self, answer):
        if self.multiple:
            return isinstance(answer, list)
        else:
            return isinstance(answer, int)


class TextWidget(Widget):
    def __init__(self, name):
        super().__init__(name)
        self.text = ""

    def type(self):
        return "text"

    def isValidAnswer(self, answer):
        return isinstance(answer, str)