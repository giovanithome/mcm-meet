import { createContext } from "react";

const PeerContext = createContext({
  currentUser: null,
  participants: null,
  localStream: null,
  connectionStatus: null,
});

export default PeerContext;
