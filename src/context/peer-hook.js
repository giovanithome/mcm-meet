import { useState, useEffect, useCallback, useRef } from "react";
import {
  databaseListener,
  childListener,
  initializeListeners,
} from "../firebase/services/peerService";

const stunServers = {
  iceServers: [
    {
      urls: [
        "stun:stun2.l.google.com:19305",
        "stun:stun4.l.google.com:19302",
        "stun:stun4.l.google.com:19305",
        "stun:stun2.l.google.com:19302",
        "stun:stun.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun3.l.google.com:19305",
        "stun:stun.l.google.com:19305",
        "stun:stun1.l.google.com:19305",
      ],
    },
  ],
  iceCandidatePoolSize: 30,
};

const usePeer = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [participants, setParticipants] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const participantsRef = useRef();
  participantsRef.current = participants;

  const init = useCallback(() => {
    const userName = prompt("Qual o seu nome?");

    databaseListener(
      userName,
      (currentUser) => {
        navigator.mediaDevices
          .getUserMedia({ audio: true, video: true })
          .then((mediaStream) => {
            setCurrentUser(currentUser);
            setLocalStream(mediaStream);
          })
          .catch((error) => {
            alert(
              `${error.message} Conecte um dispositivo de audio! e reinicie a pagina!`
            );
            // eslint-disable-next-line no-restricted-globals
            location.reload();
          });
      },
      (status) => {
        setConnectionStatus(status);
      }
    );
  }, []);

  useEffect(() => {
    if (!currentUser) {
      init();
    }

    if (currentUser) {
      childListener(
        (participant) => {
          const currentUserId = Object.keys(currentUser)[0];
          const participantId = Object.keys(participant)[0];

          if (currentUserId === participantId) {
            participant[participantId].currentUser = true;
          }

          if (localStream && !participant[participantId].currentUser) {
            const peerConection = new RTCPeerConnection(stunServers);

            // media to serve other user
            localStream.getTracks().forEach((track) => {
              peerConection.addTrack(track, localStream);
            });

            participant[participantId].peerConection = peerConection;

            setParticipants((prevState) => {
              return { ...prevState, ...participant };
            });
          } else {
            setParticipants((prevState) => ({ ...prevState, ...participant }));
          }
        },
        (participantKey) => {
          setParticipants((prevState) => {
            let participantes = { ...prevState };
            delete participantes[participantKey];

            return participantes;
          });
        }
      );
    }
  }, [currentUser, localStream, init]);

  useEffect(() => {
    if (currentUser) {
      initializeListeners(Object.keys(currentUser)[0], async (id) => {
        while (!participantsRef.current[id]) {
          await new Promise((r) => setTimeout(r, 500));
        }

        // já deve estar carregado!
        return participantsRef.current[id];
      });
    }
  }, [currentUser]);

  return { currentUser, participants, localStream, connectionStatus };
};

export default usePeer;
