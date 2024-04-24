import React, { useContext, useState, useEffect, useCallback } from "react";
import ParticipantsList from "./ParticipantsList";
import { PeerContext } from "../../context";
import {
  VolumeUpIcon,
  VideoCameraIcon,
  PhoneIcon,
} from "@heroicons/react/solid";
import { disconnectUser } from "../../firebase/services/peerService";

const ScreenSharePage = () => {
  const { participants, localStream, connectionStatus } =
    useContext(PeerContext);
  const participantsKey = Object.keys(participants);
  const [videoStatus, setVideoStatus] = useState(false);
  const [audioStatus, setAudioStatus] = useState(false);

  const toogleVideoHandler = () => {
    localStream.getVideoTracks()[0].enabled =
      !localStream.getVideoTracks()[0].enabled;

    setVideoStatus((prevState) => !prevState);
  };

  const toogleAudioHandler = () => {
    localStream.getAudioTracks()[0].enabled =
      !localStream.getAudioTracks()[0].enabled;

    setAudioStatus((prevState) => !prevState);
  };

  const disconnectHandler = useCallback(() => {
    disconnectUser();

    localStream.getVideoTracks().forEach((track) => {
      track.stop();
    });

    localStream.getAudioTracks().forEach((track) => {
      track.stop();
    });

    participantsKey.forEach((key) => {
      if (!participants[key].currentUser) {
        participants[key].peerConection.close();
      }
    });

    alert("Voce Desconectou!");
  }, [localStream, participants, participantsKey]);

  useEffect(() => {
    if (connectionStatus === false) {
      disconnectHandler();
    }
  }, [connectionStatus, disconnectHandler]);

  return (
    <section className="max-w-full mx-auto px-8 py-4">
      <ParticipantsList
        participantsKey={participantsKey}
        participants={participants}
      />

      <div className="absolute bottom-5 left-2/4 transform -translate-x-2/4 flex gap-5">
        <div
          className={`flex justify-center items-center w-10 h-10 rounded-full bg-neutral-400 cursor-pointer ${
            audioStatus
              ? "bg-red-900 text-white"
              : "bg-neutral-400 text-slate-900"
          }`}
          onClick={toogleAudioHandler}
        >
          <VolumeUpIcon className="w-5 text-slate-900" />
        </div>

        <div
          className={`flex justify-center items-center w-10 h-10 rounded-full bg-neutral-400 cursor-pointer ${
            videoStatus
              ? "bg-red-900 text-white"
              : "bg-neutral-400 text-slate-900"
          }`}
          onClick={toogleVideoHandler}
        >
          <VideoCameraIcon className="w-5 fill-current" />
        </div>

        <div
          className={`flex justify-center items-center w-10 h-10 rounded-full cursor-pointer bg-red-900 text-white`}
          onClick={disconnectHandler}
        >
          <PhoneIcon className="w-5 fill-current" />
        </div>
      </div>
    </section>
  );
};

export default ScreenSharePage;
