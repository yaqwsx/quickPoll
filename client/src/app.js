import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";
import {Room} from "./room";
import {Teacher} from "./teacher";
import {NoMatch} from "./components";
import "./main.css";
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { fab } from '@fortawesome/free-brands-svg-icons'

library.add(fas, far, fab);

function Container(props) {
    return <div className="container mx-auto px-2">{props.children}</div>
}

export default function App() {
    return (
        <Container>
            <Router>
                <Switch>
                    <Route exact path="/">
                        <Home />
                    </Route>
                    <Route path="/room/:roomId" component={Room} />
                    <Route path="/teacher" component={Teacher} />
                    <Route path="*">
                        <NoMatch />
                    </Route>
                </Switch>
            </Router>
            <Footer/>
        </Container>
    );
}

function Home() {
    return <>
        <div className="py-4 my-8 w-full bg-blue-300 rounded">
            <div className="text-center">
                <img src="/favicon.svg"
                    alt=""
                    style={{width: "150px", height: "150px"}}
                    className="inline-block"/>
                <h1 className="text-center text-6xl font-bold inline-block">
                    QuickPoll
                </h1>
            </div>
            <p className="text-center">
                Simple tool to collect real-time feedback from students
            </p>
        </div>

        <div className="py-4 my-8 w-full text-xl text-center">
            Start using the app by asking your tutor for a room link!
        </div>
    </>
}

function Footer() {
    return (<div className="border-t-2 text-gray-700 text-center text-xs py-2 my-8">
        <p>QuickPoll &mdash; Jan Mrázek</p>
        <p>Source code available at&nbsp;
            <a href="https://github.com/yaqwsx/quickPoll"
                className="underline text-blue-500 hover:text-blue-800">
                https://github.com/yaqwsx/quickPoll
            </a>
        </p>
    </div>);
}

