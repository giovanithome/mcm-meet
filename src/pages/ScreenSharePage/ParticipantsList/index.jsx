import React from "react";
import ParticipantItem from "../ParticipantItem";

const ParticipantsList = ({ participantsKey, participants }) => {
  const participantsNumber = participantsKey.length;

  return (
    <ul
      className={`h-85 grid ${
        participantsNumber === 1
          ? "grid-cols-1"
          : participantsNumber === 2
          ? "normal:grid-cols-2 small:grid-cols-1 phone:grid-cols-1"
          : participantsNumber === 3
          ? "grid-cols-2 phone:grid-cols-1"
          : "normal:grid-cols-4 small:grid-cols-3 phone:grid-cols-2"
      } gap-4`}
    >
      {participantsKey.map((key) => {
        const currentParticipant = participants[key];

        return (
          <ParticipantItem
            key={key}
            participant={currentParticipant}
            participantKey={key}
          />
        );
      })}
    </ul>
  );
};

export default ParticipantsList;
