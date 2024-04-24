import React, { useEffect, useRef, useContext } from "react";
import { PeerContext } from "../../../context";
import { createOffer } from "../../../firebase/services/peerService";

const ParticipantItem = ({ participant, participantKey }) => {
  const { localStream, currentUser } = useContext(PeerContext);
  const videoRef = useRef(null);

  useEffect(() => {
    const remoteStream = new MediaStream();

    if (participant.peerConection) {
      participant.peerConection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });

        videoRef.current.srcObject = remoteStream;
      };

      if (!participant.currentUser) {
        // quem cria a offer
        const currentUserKey = Object.keys(currentUser)[0];

        // definindo quem vai gerar a offer
        const sortedIds = [currentUserKey, participantKey].sort((a, b) =>
          a.localeCompare(b)
        );

        if (sortedIds[1] === currentUserKey) {
          // Create Offer
          createOffer(participant.peerConection, sortedIds[1], sortedIds[0]);
        }
      }
    }
  }, [participant, currentUser, participantKey]);

  useEffect(() => {
    if (localStream && participant.currentUser) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, participant]);

  useEffect(() => {
    let lastResult;
    let tentativas = 0;
    let intervalId;

    if (participant.peerConection && !participant.currentUser) {
      intervalId = setInterval(() => {
        participant.peerConection.getStats(null).then((stats) => {
          stats.forEach((report) => {
            let bytes;

            if (report.type === "outbound-rtp" && report.kind === "video") {
              if (report.isRemote) {
                return;
              }

              const now = report.timestamp;
              bytes = report.bytesSent;

              if (lastResult && lastResult.has(report.id)) {
                const bitrate =
                  (8 * (bytes - lastResult.get(report.id).bytesSent)) /
                  (now - lastResult.get(report.id).timestamp);

                if (bitrate === 0) {
                  tentativas++;
                  console.log(`bitrate: ${bitrate}`);
                }

                if (tentativas === 10) {
                  clearInterval(intervalId);

                  alert(
                    `conexao com usuario ${participant.userName} não foi possivel!. Tente reiniciar o verifique sua conexão com a internet`
                  );
                }
              }
            }
          });

          lastResult = stats;
        });
      }, 2000);

      // participant.peerConection.oniceconnectionstatechange = () => {
      //   const state = participant.peerConection.iceConnectionState;

      //   console.log(`current state: ${state}`);

      //   if (state === "disconnected" || state === "failed") {
      //     clearInterval(intervalId);

      //     alert(`conexao com o usuario ${participant.userName} caiu`);
      //   }
      // };
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [
    participant.peerConection,
    participant.currentUser,
    participant.userName,
  ]);

  return (
    <li
      className={`relative h-full w-full  bg-white rounded-md shadow-md overflow-hidden`}
    >
      <video
        className={`h-full w-full object-contain`}
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.currentUser ? true : false}
      />

      <p className="absolute top-1 left-3 text-black text-2xl font-semibold">
        {participant.userName?.toUpperCase()}
      </p>
    </li>
  );
};

export default ParticipantItem;
