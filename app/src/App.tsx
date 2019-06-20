import React from "react";
import "./App.css";
import { GameStore } from "./components/GameStore";

export class App extends React.Component {
  componentDidMount() {
    console.log("mounted app/./...................");
  }
  render() {
    return (
      <div className="App">
        <GameStore />
      </div>
    );
  }
}
