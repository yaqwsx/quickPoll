import React from "react";
import { Redirect } from "react-router-dom";

export function Spinbox() {
    return <div className="w-full text-center">
        <svg className="animate-spin -ml-1 m-8 h-5 w-5 text-black mx-auto inline-block"
             xmlns="http://www.w3.org/2000/svg"
             fill="none" viewBox="0 0 24 24"
             style={{"maxWidth": "100px", "maxHeight": "100px", "width": "100%", "height": "100%"}}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
}

export function InlineSpinbox(props) {
    return <div className={`inline text-center ${props.className}`}>
        <svg className="animate-spin h-5 w-5 text-black mx-auto inline-block"
             xmlns="http://www.w3.org/2000/svg"
             fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
}


export function NoMatch() {
    return <p>404 not found</p>;
}

export function ConnectionErrorMessage() {
    return <div className="w-full text-center">
        <h1 className="text-xl m-8">
            Server neodpovídá, zkouším se připojit znovu.
        </h1>
        <Spinbox/>
    </div>
}

export function NonExistentRoom(props) {
    return <div className="w-full text-center">
        <h1 className="text-xl m-8">Místnost s id '{props.roomId}' neexistuje. Zkontrolujte prosím zadané URL.</h1>
    </div>
}

export function UnknownError(props) {
    return <div className="w-full text-center">
        <h1 className="text-xl m-8">Nastala neznámá chyba "{props.error}".</h1>
    </div>
}

export class NotATeacherError extends React.Component {
    constructor(props) {
        super(props)
        this.state = { redirect: false };
    }

    componentDidMount() {
        setTimeout(() => {
            this.setState({redirect: true});
        }, 4000);
    }

    render() {
        if (this.state.redirect)
            return <Redirect to="/"/>
        return <div className="w-full text-center">
            <h1 className="text-xl m-8">Pro tuto akci nemáte dostatečná oprávnění. Za chvíli budete přesměrování na úvodní stránku</h1>
        </div>
    }
}

export function Checkbox(props) {
    return <input
        type="checkbox"
        checked={props.value}
        {...props}
        onChange={e => {
            e.target.value = e.target.checked;
            props.onChange(e);
        }}
    />;
}

export class BusyButton extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            busy: false
        }
    }

    handleClick = () => {
        this.setState({busy: true});
        this.props.onClick(() => {
            this.setState({busy: false});
        });
    }

    render() {
        return <button className={this.props.className} onClick={this.handleClick}>
            {
                this.state.busy
                ? <InlineSpinbox/>
                : this.props.children
            }
        </button>

    }
}
