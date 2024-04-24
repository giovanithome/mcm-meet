import React from "react";
import { PeerContext, usePeer } from "./context";

const StartContext = ({ children }) => {
  const { currentUser, participants, localStream, connectionStatus } =
    usePeer();

  return (
    <PeerContext.Provider
      value={{ currentUser, participants, localStream, connectionStatus }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export default StartContext;
