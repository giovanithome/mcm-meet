import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import StartContext from "./StartContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <StartContext>
    <App />
  </StartContext>
);
