import React from "react";
import socketIOClient from "socket.io-client";
import {produce, enableMapSet} from 'immer';
import { Spinbox, ConnectionErrorMessage, NonExistentRoom, UnknownError } from "./components"

enableMapSet();


export class Room extends React.Component {
    constructor(){
        super();
        this.state = {
            roomLayout: [], // List of widgets
            answers: {}
        };
    }

    componentDidMount() {
        this.io = socketIOClient.connect();
        this.io.on("roomUpdate", this.onRoomUpdate);
        this.io.on("reconnect", attemptNumber => {
            this.joinRoom();
        });
        this.io.on("connect_error", this.onConnectError);
        this.io.on("connect_timeout", this.onConnectError);
        this.joinRoom();
    }

    componentWillUnmount() {
        this.io.close();
    }

    joinRoom = () => {
        this.io.emit('joinRoom',
            this.props.match.params.roomId,
            this.onRoomUpdate);
    }

    forceJoinRoom = () => {
        this.io.emit('forceJoinRoom',
            this.props.match.params.roomId,
            this.onRoomUpdate);
    }

    sendDataUpdate = () => {
        this.io.emit("answerUpdate",
            this.props.match.params.roomId,
            this.state.answers);
    }

    onRoomUpdate = response => {
        if (response.status === "success") {
            document.title = response.roomLayout.name;
            this.setState({
                layout: response.roomLayout,
                answers: response.answers,
                error: undefined
            });
        }
        else
            this.setState({
                layout: undefined,
                error: response.reason
            });
    }

    onConnectError = () => {
        this.setState({
            roomLayout: undefined,
            error: "connectionError"
        });
    }

    handleWidgetChange = (widgetId, value) => {
        this.setState(produce(this.state, draft => {
            draft.answers[widgetId] = value;
        }), () => {
            clearTimeout(this.serverUpdateTimeout);
            this.serverUpdateTimeout = setTimeout(this.sendDataUpdate, 1000);
        });
    }

    renderAlreadyJoined() {
        return <div className="w-full text-center">
            <h1 className="text-xl m-8">Do této místnosti jste již připojeni v jiném okně prohlížeče.</h1>
            <button className="block w-full mx-2 bg-blue-500 hover:bg-blue-700 text-black py-1 px-2 rounded"
                onClick={this.forceJoinRoom}>
                Používat místnost zde
            </button>
        </div>
    }

    render() {
        if (this.state.error === "noSuchRoom")
            return <NonExistentRoom roomId={this.props.match.params.roomId}/>

        if (this.state.error === "alreadyJoined")
            return this.renderAlreadyJoined();

        if (this.state.error === "connectionError")
            return <ConnectionErrorMessage/>

        if (this.state.error)
            return <UnknownError error={this.state.error}/>

        if (!this.state.layout)
            return <Spinbox />

        let layout = this.state.layout;
        return <>
            <h1 className="text-3xl my-4">{layout.name}</h1>
            <p>{layout.description}</p>
            {
                layout.widgets.length
                ? layout.widgets.map(x =>
                    <PollWidget
                        key={x.id}
                        layout={x}
                        value={this.state.answers[x.id]}
                        onChange={value => this.handleWidgetChange(x.id, value)}/>)
                : <p>Tato místnost zatím nic neobsahuje</p>
            }
        </>
    }
}

function PollWidget(props) {
    let input = <></>;
    if (props.layout.type === "choice")
        input = <ChoiceWidget {...props} />
    if (props.layout.type === "text")
        input = <TextWidget {...props} />
    return <div className="w-full bg-blue-200 rounded my-5 p-3">
        <h2 className="text-xl">
            {props.layout.name}
        </h2>
        <p>{props.layout.description}</p>
        {input}
    </div>
}

function SingleChoiceItem(props) {
    return <div className="w-full">
        <input
            className="mr-2 leading-tight"
            type="radio"
            onChange={props.onChange}
            checked={props.value}/>
        <span className="">
            {props.text}
        </span>
    </div>
}

function MultipleChoiceItem(props) {
    return <div className="w-full">
        <input
            className="mr-2 leading-tight"
            type="checkbox"
            onChange={props.onChange}
            checked={props.value}/>
        <span className="">
            {props.text}
        </span>
    </div>
}

class ChoiceWidget extends React.Component {
    handleSingleChoiceChange = (id, _) => {
        this.props.onChange(id);
    }

    handleMultipleChoiceChange = (id, value) => {
        let currentValue = this.props.value && Array.isArray(this.props.value)
            ? this.props.value
            : [];
        let newValue;
        if (value)
            newValue = currentValue.concat([id])
        else
            newValue = currentValue.filter(x => x !== id);
        this.props.onChange(newValue);
    }

    choiceValue = (id) => {
        if (this.props.layout.multiple) {
            if (this.props.value && Array.isArray(this.props.value))
                return this.props.value.includes(id);
            return false
        }
        if (this.props.value && Number.isInteger(this.props.value))
            return id === this.props.value;
        return false;
    }

    render() {
        let ItemWidget = this.props.layout.multiple
            ? MultipleChoiceItem
            : SingleChoiceItem;
        let handler = this.props.layout.multiple
            ? this.handleMultipleChoiceChange
            : this.handleSingleChoiceChange;
        return this.props.layout.choices.map(x =>
            <ItemWidget
                key={x.id}
                onChange={e => {
                    handler(x.id, e.target.checked);
                }}
                value={this.choiceValue(x.id)}
                {...x} />
        );
    }
}

function TextWidget(props) {
    let value = props.value ? props.value : "";
    return <input
        type="text"
        className="w-full p-2 rounded"
        value={value}
        onChange={e => {
            e.preventDefault();
            props.onChange(e.target.value);
        }}/>;
}