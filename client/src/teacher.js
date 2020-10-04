import React from "react";
import {
    Switch,
    Route,
    Link
} from "react-router-dom";
import socketIOClient from "socket.io-client";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { CopyToClipboard } from 'react-copy-to-clipboard';
import {
    NoMatch,
    ConnectionErrorMessage,
    Spinbox,
    InlineSpinbox,
    UnknownError,
    NonExistentRoom,
    Checkbox,
    BusyButton,
    NotATeacherError
} from "./components";
import { produce } from "immer";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

export class Teacher extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            connectionError: false,
            notATeacher: false
        };
        let server = window.location.protocol + "//" + window.location.host;
        this.io = socketIOClient.connect(server, {path: process.env.PUBLIC_URL + "/socket.io"});
    }

    componentDidMount() {
        this.io.on("connect_error", this.onConnectError);
        this.io.on("connect_timeout", this.onConnectError);
        this.io.on("reconnect", this.onReconnect);
        this.io.emit("whoAmI", (response) => {
            if (response === undefined ||
                !Array.isArray(response) ||
                !response.includes("teacher") )
            {
                this.setState({notATeacher: true});
            }
        });
    }

    componentWillUnmount() {
        this.io.close();
    }

    onConnectError = () => {
        this.setState({connectionError: true});
    }

    onReconnect = () => {
        this.setState({connectionError: false});
    }

    render() {
        let baseUrl = this.props.match.url;
        return <>
            <h1 className="text-2xl">
                Quick Poll: Pohled učitele
            </h1>
            {
                this.state.connectionError
                    ? <ConnectionErrorMessage/>
                : this.state.notATeacher
                    ? <NotATeacherError />
                :
                    <Switch>
                        <Route path={baseUrl + "/"}
                            exact={true} render={props =>
                                <TeacherRoomOverview {...props} io={this.io} />} />
                        <Route path={baseUrl + "/room/:roomId"}
                            exact={true} render={props =>
                                <TeacherRoomView {...props} io={this.io} />} />
                        <Route path={baseUrl + "/room/:roomId/edit"}
                            exact={true} render={props =>
                                <TeacherRoomEdit {...props} io={this.io} />} />
                        <Route path="*" component={NoMatch} io={this.io} />
                    </Switch>
            }
        </>
    }
}

class TeacherRoomOverview extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            rooms: undefined,
            deletingRoom: undefined,
            creatingRoom: false
        };
    }

    componentDidMount() {
        let io = this.props.io;
        io.on("rooms", this.onRooms);
        io.emit("subscribeRooms", this.onRooms);
    }

    componentWillUnmount() {
        let io = this.props.io;
        io.emit("unsubscribeRooms");
        io.off("rooms");
    }

    onRooms = (rooms) => {
        document.title = "Přehled místností";
        this.setState({rooms: rooms});
    }

    getRoom = (roomId) => {
        for (let room of this.state.rooms) {
            if (roomId === room.id)
                return room;
        }
        return undefined;
    }

    deleteRoom = (roomId) => {
        if (this.getRoom(roomId).activeMembers !== 0) {
            if (!window.confirm("V místnosti jsou ještě studenti. Opravdu smazat?"))
                return;
        }
        this.setState({deletingRoom: roomId});
        this.props.io.emit("deleteRoom", roomId, () => {
            this.setState({deletingRoom: undefined});
        });
    }

    createNewRoom = () => {
        this.setState({creatingRoom: true});
        this.props.io.emit("createRoom", (roomId) => {
            this.setState({creatingRoom: false});
            this.props.history.push("/teacher/room/" + roomId + "/edit");
        });
    }


    renderRoomOverview = () => {
        return <table className="w-full">
            <thead className="font-bold border-b-2">
                <tr>
                    <td>
                        URL místnosti
                    </td>
                    <td>
                        Název
                    </td>
                    <td>
                        Autor
                    </td>
                    <td className="text-center">
                        Počet aktivních studentů
                    </td>
                </tr>
            </thead>
            <tbody>{
                this.state.rooms.map(room => {
                    let roomRelUrl = "/room/" + room.id;
                    let roomUrl = window.location.protocol + "//" + window.location.host + roomRelUrl;
                    return <tr key={room.id}>
                        <td>
                            <CopyToClipboard text={roomUrl}>
                                <button className="py-2 px-4" onClick={e => e.stopPropagation()}>
                                    <FontAwesomeIcon icon="clipboard"/>
                                </button>
                            </CopyToClipboard>
                            <Link to={roomRelUrl}>
                                {roomUrl}
                            </Link>
                        </td>
                        <td>
                            <Link to={"/teacher/room/" + room.id}>
                                {room.name}
                            </Link>
                        </td>
                        <td>
                            {room.author}
                        </td>
                        <td className="text-center">
                            {room.activeMembers}
                        </td>
                        <td>
                            <Link to={"/teacher/room/" + room.id}>
                                <button className="inline-block mx-1 bg-blue-500 hover:bg-blue-700 text-black py-1 px-4 rounded">
                                    Prohlížet
                                </button>
                            </Link>
                            <Link to={"/teacher/room/" + room.id + "/edit"}>
                                <button className="inline-block mx-1 bg-yellow-500 hover:bg-yellow-700 text-black py-1 px-4 rounded">
                                    Upravit
                                </button>
                            </Link>
                            <button className="inline-block mx-1 bg-red-500 hover:bg-red-700 text-black py-1 px-4 rounded"
                                    onClick={e => this.deleteRoom(room.id)}>
                                { this.state.deletingRoom === room.id
                                    ? <InlineSpinbox className="mx-2"/>
                                    : "Smazat" }
                            </button>
                        </td>
                    </tr>})
            }</tbody>
        </table>;


    }

    render() {
        return <>
            <h2 className="text-xl">
                Přehled místností
            </h2>
            <div className="flex">
                <button className="block ml-auto mx-2 bg-blue-500 hover:bg-blue-700 text-black py-1 px-2 rounded"
                    onClick={e => this.createNewRoom()}>
                    { this.state.creatingRoom
                        ? <InlineSpinbox className="mx-2"/>
                        : "Nová místnost"
                    }
                </button>
            </div>
            {
                this.state.rooms === undefined
                ? <Spinbox/>
                : this.state.rooms.length
                    ? this.renderRoomOverview()
                    : <p>Žádné místnosti zatím nebyly vytvořeny</p>
            }
        </>;
    }
}

class TeacherRoomView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: undefined,
            layout: undefined,
            answers: undefined
        };
    }

    componentDidMount() {
        let io = this.props.io;
        io.on("room", this.onRoom);
        io.emit("subscribeRoom", this.props.match.params.roomId, this.onRoom);
    }

    componentWillUnmount() {
        let io = this.props.io;
        io.emit("unsubscribeRoom", this.props.match.params.roomId);
        io.off("room");
    }

    onRoom = (response) => {
        if (response === undefined)
            return;
        if (response.status === "error") {
            this.setState({
                layout: undefined,
                answers: undefined,
                error: response.reason
            });
        }
        else {
            document.title = response.roomLayout.name + " - prohlížení";
            this.setState({
                layout: response.roomLayout,
                answers: response.answers,
                error: undefined
            })
        }
    }

    renderStudentTable = () => {
        if (this.state.layout)
            return <StudentAnswerOverview
                layout={this.state.layout} answers={this.state.answers}/>
        else
            return "No data";
    }

    render() {
        if (this.state.error === "noSuchRoom")
            return <NonExistentRoom roomId={this.props.match.params.roomId}/>;

        if (this.state.error)
            return <UnknownError error={this.state.error}/>;

        if (!this.state.layout) {
            return <Spinbox/>
        }

        let roomRelUrl = "/room/" + this.state.layout.id;
        let roomUrl = window.location.protocol + "//" + window.location.host + roomRelUrl;
        return <>
            <div className="w-full flex items-center">
                <h1 className="text-2xl flex-none">
                    Místnost "{this.state.layout.name}"
                </h1>
                <CopyToClipboard text={roomUrl}>
                    <button className="flex-none mx-8 py-2 px-4 text-base text-gray-700 outline-none" onClick={e => e.stopPropagation()}>
                        <FontAwesomeIcon icon="clipboard"/> {roomUrl}
                    </button>
                    </CopyToClipboard>
                <Link to={"/teacher/room/" + this.state.layout.id + "/edit"} className="block flex-none ml-auto">
                    <button className="bg-yellow-500 hover:bg-yellow-700 text-black py-1 px-4 rounded">
                        Upravit místnost
                    </button>
                </Link>
                <Link to={"/teacher"} className="block flex-none ml-2">
                    <button className="bg-yellow-500 hover:bg-yellow-700 text-black py-1 px-4 rounded">
                        Zpět na přehled místností
                    </button>
                </Link>
            </div>
            {this.renderStudentTable()}
        </>;
    }
}

class StudentAnswerOverview extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            activeRow: undefined
        };
    }

    renderTableHeader() {
        return <>
            <thead className="border-b-4 border-white py-1 text-center">
                <tr>
                    <th rowSpan="2">
                        Student
                    </th>
                    {
                        this.props.layout.widgets.map((widget, index) => {
                            let colspan = widget.type === "text"
                                ? 1
                                : widget.choices.length;
                            let className = "p-1 pt-3 text-lg";
                            className += " " + this.cellBorders(0, 1);
                            className += " " + this.widgetColumnStyle(index);
                            return <th key={widget.id} colSpan={colspan} className={className}>
                                {widget.name}
                            </th>
                        })
                    }
                </tr>
                <tr>
                    {
                        this.props.layout.widgets.flatMap((widget, index) => {
                            let className = "p-1 " + this.widgetColumnStyle(index);
                            if (widget.type === "text") {
                                className += " " + this.cellBorders(0, 1);
                                return [<th key={widget.id} className={className}></th>];
                            }
                            if (widget.type === "choice") {
                                return widget.choices.map((choice, choiceIndex) => {
                                    let thClassName = className;
                                    thClassName += " " + this.cellBorders(choiceIndex, widget.choices.length);
                                    return <th key={String(widget.id) + String(choice.id)} className={thClassName}>
                                        {choice.text}
                                    </th>
                                });
                            }
                            return [<th></th>]
                        })
                    }
                </tr>
            </thead>
        </>;
    }

    widgetColspan(widget) {
        if (widget.type === "text")
            return 1;
        if (widget.type === "choice")
            return widget.choices.length;
        return 1;
    }

    renderEmptyBody() {
        let colspan = 1 + this.props.layout.widgets.reduce((current, w) => {
            return current + this.widgetColspan(w);
        }, 0);
        return <tr>
            <td colSpan={colspan} className="text-xl text-center p-4">
                Do této místnosti není nikdo připojen
            </td>
        </tr>
    }

    sortedAnswers(answers) {
        let sortedAnswers = Object.entries(answers);
        sortedAnswers.sort((a, b) => {
            return a[0].localeCompare(b[0])
        });
        return sortedAnswers;
    }

    widgetColumnStyle(widgetIdx) {
        if (widgetIdx % 2 === 0)
            return "bg-blue-200"
        else
            return "bg-blue-300"
    }

    cellBorders(choiceIdx, choiceCount) {
        return "border-white border-l-4 border-r-4";
        // let className = "";
        // if (choiceIndex === 0)
        //     className += " border-white border-l-4";
        // if (choiceIndex === choiceCount - 1)
        //     className += " border-white border-r-4";
        // return className;
    }

    renderTextWidgetAnswers(widget, index, answers) {
        let text = "";
        let widgetId = String(widget.id);
        if (Object.keys(answers).includes(widgetId)) {
            text = answers[widgetId];
        }
        let className = "px-2 " + this.cellBorders(0, 1);
        className += " " + this.widgetColumnStyle(index);
        return [<td key={widget.id} className={className}>
            {text}
        </td>]
    }

    renderChoiceWidgetAnswers(widget, widgetIndex, answers) {
        let checkedOptions = [];
        let widgetId = String(widget.id);
        if (Object.keys(answers).includes(widgetId)) {
            if (!widget.multiple) {
                checkedOptions = [answers[widgetId]];
            } else {
                checkedOptions = answers[widgetId];
            }
        }
        return widget.choices.map((choice, choiceIndex) => {
            let className = "p-1 text-center";
            className +=  " " + this.widgetColumnStyle(widgetIndex);
            className += " " + this.cellBorders(choiceIndex, widget.choices.length);
            return <td key={String(widget.id) + String(choice.id)} className={className}>
                { Array.isArray(checkedOptions) && checkedOptions.includes(choice.id) ? <FontAwesomeIcon icon="check-circle"/> : "" }
            </td>});
    }

    handleRowEnter = (row, event) => {
        event.stopPropagation();
        this.setState({activeRow: row});
    }

    handleRowLeave = (row, event) => {
        event.stopPropagation();
        this.setState({activeRow: undefined});
    }

    renderTableBody() {
        return <tbody>{
            Object.keys(this.props.answers).length === 0
            ? this.renderEmptyBody()
            : this.sortedAnswers(this.props.answers).map( (answer, rowIdx) => {
                let username = answer[0];
                let rowClassName = "";
                if (rowIdx === this.state.activeRow)
                    rowClassName += " border-solid border-black border-b-2";
                return <tr key={username}
                          className={rowClassName}
                          onMouseEnter={e => this.handleRowEnter(rowIdx, e)}
                          onMouseLeave={e => this.handleRowLeave(rowIdx, e)}>
                    <td className="p-1">{username}</td>
                    {
                        this.props.layout.widgets.flatMap((widget, index) => {
                            if (widget.type === "text")
                                return this.renderTextWidgetAnswers(widget, index, this.props.answers[username])
                            if (widget.type === "choice")
                                return this.renderChoiceWidgetAnswers(widget, index, this.props.answers[username])
                            return [<td></td>]
                        })
                    }
                </tr>
            })
        }</tbody>;
    }

    render() {
        if (this.props.layout === undefined)
            return <Spinbox/>
        return <table className="w-full">
            { this.renderTableHeader() }
            { this.renderTableBody() }
        </table>
    }
}

function getById(array, id) {
    for (let elem of array) {
        if (elem.id === id)
            return elem;
    }
    return undefined;
}

class TeacherRoomEdit extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            layout: undefined,
            error: undefined
        }
    }
    componentDidMount() {
        let io = this.props.io;
        io.on("room", this.onRoom);
        io.emit("subscribeRoom", this.props.match.params.roomId, this.onRoom);
    }

    componentWillUnmount() {
        let io = this.props.io;
        io.emit("unsubscribeRoom", this.props.match.params.roomId);
        io.off("room");
    }

    onRoom = (response) => {
        if (response === undefined)
            return
        if (response.status === "error") {
            this.setState({
                layout: undefined,
                answers: undefined,
                error: response.reason
            });
        }
        else {
            document.title = response.roomLayout.name + " - úprava"
            this.setState(produce(this.state, draft => {
                draft.error = undefined;
                draft.layout = response.roomLayout;
            }));
        }
    }

    handleWidgetDragEnd = (result) => {
        if (!result.destination)
            return;
        let io = this.props.io;
        io.off("room"); // Temporarily stop listening to avoid flickering
        this.setState(produce(this.state, draft => {
            draft.layout.widgets = reorder(draft.layout.widgets,
                result.source.index, result.destination.index);
        }), () => {
            io.emit("reorderWidgets", this.props.match.params.roomId,
                this.state.layout.widgets.map(w => w.id), (response) => {
                    io.on("room");
                    if (response)
                        this.onRoom(response);
                });
        });
    }

    handleChoiceDragEnd = (widgetId, result) => {
        if (!result.destination)
            return;
        let io = this.props.io;
        io.off("room"); // Temporarily stop listening to avoid flickering
        this.setState(produce(this.state, draft => {
            // eslint-disable-next-line
            let choices = getById(draft.layout.widgets, widgetId).choices;
            choices = reorder(choices,
                result.source.index, result.destination.index);
        }), () => {
            let choices = getById(this.state.layout.widgets, widgetId).choices;
            io.emit("reorderChoices", this.props.match.params.roomId, widgetId,
                choices.map(w => w.id), (response) => {
                    io.on("room");
                    if (response)
                        this.onRoom(response);
                });
        });
    }

    render() {
        if (this.state.error === "noSuchRoom")
            return <NonExistentRoom roomId={this.props.match.params.roomId}/>;

        if (this.state.error)
            return <UnknownError error={this.state.error}/>;

        if (!this.state.layout) {
            return <Spinbox/>
        }

        let roomRelUrl = "/room/" + this.state.layout.id;
        let roomUrl = window.location.protocol + "//" + window.location.host + roomRelUrl;
        return <>
            <div className="w-full flex items-center">
                <h1 className="text-2xl flex-none">
                    Místnost "{this.state.layout.name}"
                </h1>
                <CopyToClipboard text={roomUrl}>
                    <button className="flex-none mx-1 py-2 px-4 text-base text-gray-700 outline-none" onClick={e => e.stopPropagation()}>
                        <FontAwesomeIcon icon="clipboard"/> {roomUrl}
                    </button>
                    </CopyToClipboard>
                <Link to={"/teacher/room/" + this.state.layout.id} className="block flex-none ml-auto">
                    <button className="bg-blue-500 hover:bg-blue-700 text-black py-1 px-4 rounded">
                        Prohlížet místnost
                    </button>
                </Link>
                <Link to={"/teacher"} className="block flex-none ml-2">
                    <button className="bg-yellow-500 hover:bg-yellow-700 text-black py-1 px-4 rounded">
                        Zpět na přehled místností
                    </button>
                </Link>
            </div>

            <RoomProperties
                room={this.state.layout}
                io={this.props.io}
                />

            <WidgetList
                roomId={this.props.match.params.roomId}
                widgets={this.state.layout.widgets}
                onWidgetDragEnd={this.handleWidgetDragEnd}
                onChoiceDragEnd={this.handleChoiceDragEnd}
                io={this.props.io}/>
            <div className="w-full flex p-2 mb-5">
                <BusyButton
                    className="flex-1 mr-2 bg-yellow-500 hover:bg-yellow-700 text-black py-1 px-4 rounded"
                    onClick={finishedCallback => {
                        this.props.io.emit("addWidget", this.props.match.params.roomId, "text",
                            finishedCallback);
                    }}>
                        Nová textová otázka
                </BusyButton>

                <BusyButton
                    className="flex-1 ml-2 bg-yellow-500 hover:bg-yellow-700 text-black py-1 px-4 rounded"
                    onClick={finishedCallback => {
                        this.props.io.emit("addWidget", this.props.match.params.roomId, "choice",
                            finishedCallback);
                    }}>
                        Nová otázka s možnostmi
                </BusyButton>
            </div>
        </>
    }
}

function RoomProperties(props) {
    return <div className="my-2 p-2 mx-2 bg-blue-500 rounded">
         <div className="w-full flex items-center my-2">
            <div className="flex-none w-1/6 mr-2 font-bold text-right">
                Název místnosti:
            </div>
            <EditableInput
                className="flex-1 outline-none rounded ml-2 p-1"
                inputRenderer={inputRenderer}
                value={props.room.name}
                onChange={(value, afterCallback) => {
                    props.io.emit("changeRoomName", props.room.id, value,
                        afterCallback);
                }}/>
        </div>

        <div className="w-full flex items-center my-2">
            <div className="flex-none w-1/6 mr-2 font-bold text-right">
                Popis místnosti:
            </div>
            <EditableInput
                className="flex-1 outline-none rounded ml-2 p-1"
                inputRenderer={textareaRenderer}
                value={props.room.description}
                onChange={(value, afterCallback) => {
                    props.io.emit("changeRoomDescription", props.room.id, value,
                        afterCallback);
                }}/>
        </div>
    </div>
}

function reorder(list, startIndex, endIndex) {
    const [removed] = list.splice(startIndex, 1);
    list.splice(endIndex, 0, removed);
    return list;
};


function widgetListClassName(isDraggingOver) {
    let className = "p-2 rounded";
    className += isDraggingOver ? " bg-blue-200" : " bg-white";
    return className;
}

function widgetClassName(isVisible, isDragging) {
    let className =  "my-2 p-2 rounded";
    if (isVisible)
        className += " bg-blue-500";
    else
        className += " bg-gray-500";
    return className
}

function widgetTypeStr(type) {
    if (type === "choice")
        return "Otázka s možnostmi";
    if (type === "text")
        return "Textová otázka";
    return "Neznámá otázka"
}

function DraggableWidget(props) {
    return <div
        ref={props.provided.innerRef}
        {...props.provided.draggableProps}
        {...props.provided.dragHandleProps}
        style={props.provided.draggableProps.style}
        className={widgetClassName(props.widget.visible, props.snapshot.isDragging)}
        >
            <div className="flex">
                <h1 className="text-lg flex-none">
                    {widgetTypeStr(props.widget.type)} ({props.widget.id})
                </h1>
                <BusyButton
                    className="flex-none w-1/6 ml-auto bg-red-500 hover:bg-red-700 text-black py-1 rounded"
                    onClick={finishedCallback => {
                        props.io.emit("deleteWidget", props.roomId, props.widget.id,
                            finishedCallback);
                    }}>
                    Smazat otázku
                </BusyButton>
            </div>
            <EditableWidgetBase roomId={props.roomId} widget={props.widget} io={props.io} />
            {
                props.widget.type === "choice"
                    ? <EditableChoiceWidget
                        roomId={props.roomId}
                        widget={props.widget}
                        io={props.io}
                        onChoiceDragEnd={props.onChoiceDragEnd} />
                    : <></>
            }
    </div>
}

function inputRenderer(args) {
    return <input {...args} />;
}

function textareaRenderer(args) {
    return <textarea {...args}/>;
}

function checkboxRenderer(args) {
    args.className += " flex-none transform scale-150 ml-1 mr-4 my-2";
    return <Checkbox {...args}/>
}

function EditableWidgetBase(props) {
    return <>
        <div className="w-full flex items-center my-2">
            <div className="flex-none w-1/6 mr-2 font-bold text-right">
                Viditelná:
            </div>
            <EditableInput
                className="flex-1 outline-none rounded ml-2 p-1 items-center"
                inputRenderer={checkboxRenderer}
                value={props.widget.visible}
                valueExtractor={e => e.target.checked}
                onChange={(value, afterCallback) => {
                    props.io.emit("changeWidgetVisibility", props.roomId, props.widget.id, value,
                        afterCallback);
                }}/>
        </div>

        <div className="w-full flex items-center my-2">
            <div className="flex-none w-1/6 mr-2 font-bold text-right">
                Název otázky:
            </div>
            <EditableInput
                className="flex-1 outline-none rounded ml-2 p-1"
                inputRenderer={inputRenderer}
                value={props.widget.name}
                onChange={(value, afterCallback) => {
                    props.io.emit("changeWidgetName", props.roomId, props.widget.id, value,
                        afterCallback);
                }}/>
        </div>

        <div className="w-full flex items-center">
            <div className="flex-none w-1/6 mr-2 font-bold my-2 text-right">
                Popis otázky:
            </div>
            <EditableInput
                className="flex-1 outline-none rounded ml-2 p-1"
                inputRenderer={textareaRenderer}
                value={props.widget.description}
                onChange={(value, afterCallback) => {
                    props.io.emit("changeWidgetDescription", props.roomId, props.widget.id, value,
                        afterCallback);
                }}/>
        </div>
    </>
}

function choiceListClassName(isDragging) {
    let className = "flex-1 rounded ml-2 p-1 pr-0";
    if (isDragging)
        className += " bg-blue-200";
    return className;
}

function EditableChoiceWidget(props) {
    return <>
        <div className="w-full flex items-center my-2">
            <div className="flex-none w-1/6 mr-2 font-bold text-right">
                Multiple-choice:
            </div>
            <EditableInput
                className="flex-1 outline-none rounded ml-2 p-1 items-center"
                inputRenderer={checkboxRenderer}
                value={props.widget.multiple}
                valueExtractor={e => e.target.checked}
                onChange={(value, afterCallback) => {
                    props.io.emit("changeWidgetMultipleChoice", props.roomId, props.widget.id, value,
                        afterCallback);
                }}/>
        </div>
        <div className="w-full flex my-2">
            <div className="flex-none w-1/6 mr-2 font-bold text-right">
                Odpovědi:
            </div>
            <DragDropContext onDragEnd={result => props.onChoiceDragEnd(props.widget.id, result)}>
                <Droppable droppableId={"widet-" + String(props.widget.id)}>
                    {(provided, snapshot) =>
                        (<div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={choiceListClassName(snapshot.isDraggingOver)}
                            >
                            {
                                props.widget.choices.map((choice, index) => (
                                    <Draggable key={choice.id} draggableId={String(choice.id)} index={index}>
                                    {
                                        (provided, snapshot) =>
                                            <DraggableChoice
                                                roomId={props.roomId}
                                                widgetId={props.widget.id}
                                                choice={choice}
                                                provided={provided}
                                                snapshot={snapshot}
                                                io={props.io} />
                                    }
                                    </Draggable>
                                ))
                            }
                                {provided.placeholder}
                            </div>)
                    }
                </Droppable>
            </DragDropContext>
        </div>
        <div className="w-full flex my-2">
            <div className="flex-none w-1/6 mr-2 font-bold text-right"/>
            <BusyButton className="block w-full bg-yellow-500 hover:bg-yellow-700 text-black py-1 px-4 rounded"
                onClick={finishedCallback => {
                    props.io.emit("addChoice", props.roomId, props.widget.id,
                        finishedCallback);
                }}>
                Přidat odpověď
            </BusyButton>
        </div>
    </>;
}

function DraggableChoice(props) {
    return <div
        ref={props.provided.innerRef}
        {...props.provided.draggableProps}
        {...props.provided.dragHandleProps}
        style={props.provided.draggableProps.style}
        className="w-full flex items-center"
        >
            <div className="flex-none mr-2 py-3">
                <FontAwesomeIcon icon="grip-horizontal"/>
            </div>
            <EditableInput
                className="flex-1 outline-none rounded p-1 my-1 items-center"
                inputRenderer={inputRenderer}
                value={props.choice.text}
                onChange={(value, afterCallback) => {
                    props.io.emit("changeChoice",
                        props.roomId, props.widgetId, props.choice.id, value,
                        afterCallback);
                }}/>
            <BusyButton className="flex-none w-1/6 ml-1 bg-red-500 hover:bg-red-700 text-black py-2 px-4 rounded"
                    onClick={finishedCallback => {
                        props.io.emit("deleteChoice",
                            props.roomId, props.widgetId, props.choice.id,
                            finishedCallback);
                    }}>
                Smazat
            </BusyButton>
    </div>
}

function WidgetList(props) {
    return <DragDropContext onDragEnd={props.onWidgetDragEnd}>
        <Droppable droppableId="droppableWidgetList">
            {(provided, snapshot) =>
                (<div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={widgetListClassName(snapshot.isDraggingOver)}
                    >

                    {
                        props.widgets.map((widget, index) => (
                            <Draggable key={widget.id} draggableId={String(widget.id)} index={index}>
                            {
                                (provided, snapshot) =>
                                    <DraggableWidget
                                        roomId={props.roomId}
                                        widget={widget}
                                        provided={provided}
                                        snapshot={snapshot}
                                        onChoiceDragEnd={props.onChoiceDragEnd}
                                        io={props.io} />
                            }
                            </Draggable>
                        ))
                    }

                    {provided.placeholder}
                </div>)
            }
        </Droppable>
    </DragDropContext>
}

class EditableInput extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            value: undefined
        };
    }

    handleChange = (e) => {
        let value = this.props.valueExtractor
            ? this.props.valueExtractor(e)
            : e.target.value;
        this.setState({value: value});
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.props.onChange(value, () => {
                if (this.props.value === this.state.value)
                    this.setState({value: undefined});
            })
        }, 500);
    }

    dirty() {
        return this.state.value !== undefined;
    }

    dirtyStyle() {
        return "border-orange-500 border-opacity-0";
    }

    render() {
        let value = this.dirty() ? this.state.value : this.props.value;
        let className = this.props.className;
        className += " flex border-2 border-white border-opacity-100 bg-white"
        if (this.dirty()) {
            className += " " + this.dirtyStyle();
        }
        return <div className={className}>
            {
                this.props.inputRenderer({
                    value: value,
                    className: "outline-none flex-1",
                    onChange: this.handleChange
                })
            }
            <div className="flex-none w-8">
                { this.dirty() ? <InlineSpinbox/> : <></> }
            </div>
        </div>
    }
}