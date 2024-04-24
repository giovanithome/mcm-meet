import { app } from "../config";
import {
  getDatabase,
  ref,
  child,
  push,
  onValue,
  onDisconnect,
  onChildAdded,
  onChildRemoved,
  set,
  goOffline,
} from "firebase/database";

const connectedRef = ref(getDatabase(app), ".info/connected");

const getDatabaseRef = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("id");
  let dbRef = ref(getDatabase(app));

  if (roomId) {
    dbRef = child(dbRef, roomId);
  } else {
    dbRef = push(dbRef);
    window.history.replaceState(null, "Meet", `?id=${dbRef.key}`);
  }

  return dbRef;
};

const databaseListener = (userName, callback, disconnectCallback) => {
  const dbRef = getDatabaseRef();
  const participantsRef = child(dbRef, "participants");
  let init;

  // quando o usuario se conectar ao realtime db
  onValue(connectedRef, (snap) => {
    if (snap.val()) {
      const userRef = push(participantsRef, { userName: userName });

      callback({ [userRef.key]: { userName } });

      onDisconnect(userRef).remove();
    }
  });

  onValue(connectedRef, (snap) => {
    if (snap.val()) {
      console.log(`status: ${snap.val()}`);

      init = true;
    }

    if (snap.val() !== true && init === true) {
      console.log("disconnected");
      disconnectCallback(snap.val());
    }
  });
};

const childListener = (addParticipant, removeParticipant) => {
  const dbRef = getDatabaseRef();
  const participantsRef = child(dbRef, "participants");

  // quando algum usuario fizer parte dos participantes
  onChildAdded(participantsRef, (snap) => {
    const { userName } = snap.val();

    addParticipant({ [snap.key]: { userName } });
  });

  // quando algum usuario sair do app
  onChildRemoved(participantsRef, (snap) => {
    removeParticipant(snap.key);
  });
};

// peer listeners
const setMediaBitrate = (sdp, mediaType, bitrate) => {
  let sdpLines = sdp.split("\n");
  let mediaLineIndex = -1;
  let mediaLine = "m=" + mediaType;
  let bitrateLineIndex = -1;
  let bitrateLine = "b=AS:" + bitrate;

  mediaLineIndex = sdpLines.findIndex((line) => line.startsWith(mediaLine));

  // If we find a line matching “m={mediaType}”
  if (mediaLineIndex && mediaLineIndex < sdpLines.length) {
    // Skip the m line
    bitrateLineIndex = mediaLineIndex + 1;

    // Skip both i=* and c=* lines (bandwidths limiters have to come afterwards)
    while (
      sdpLines[bitrateLineIndex].startsWith("i=") ||
      sdpLines[bitrateLineIndex].startsWith("c=")
    ) {
      bitrateLineIndex++;
    }

    // If the next line is a b=* line, replace it with our new bandwidth
    if (sdpLines[bitrateLineIndex].startsWith("b=")) {
      sdpLines[bitrateLineIndex] = bitrateLine;
    } else {
      // Otherwise insert a new bitrate line.
      sdpLines.splice(bitrateLineIndex, 0, bitrateLine);
    }
  }

  // Then return the updated sdp content as a string
  return sdpLines.join("\n");
};

const setMediaBitrates = (sdp) => {
  return setMediaBitrate(setMediaBitrate(sdp, "video", 500), "audio", 50);
};

const createOffer = async (peerConection, createrId, receiverId) => {
  const dbRef = getDatabaseRef();
  const participantRef = child(dbRef, "participants");
  const receiverRef = child(participantRef, receiverId);
  const offer = await peerConection.createOffer();

  peerConection.onicecandidate = (event) => {
    event.candidate &&
      push(child(receiverRef, "offerCandidates"), {
        ...event.candidate.toJSON(),
        userId: createrId,
      });
  };

  await peerConection.setLocalDescription(offer);

  offer.sdp = setMediaBitrates(offer.sdp);

  const offerPayload = {
    sdp: offer.sdp,
    type: offer.type,
    userId: createrId,
  };

  await set(push(child(receiverRef, "offers")), { offerPayload });
};

const createAnswer = async (peerConection, currentUserId, receiverId) => {
  const dbRef = getDatabaseRef();
  const participantRef = child(dbRef, "participants");
  const receiverRef = child(participantRef, receiverId);
  const answer = await peerConection.createAnswer();

  peerConection.onicecandidate = (event) => {
    event.candidate &&
      push(child(receiverRef, "answerCandidates"), {
        ...event.candidate.toJSON(),
        userId: currentUserId,
      });
  };

  await peerConection.setLocalDescription(answer);

  answer.sdp = setMediaBitrates(answer.sdp);

  const answerPayload = {
    sdp: answer.sdp,
    type: answer.type,
    userId: currentUserId,
  };

  await set(push(child(receiverRef, "answers")), { answerPayload });
};

const waitRemoteDesc = async (peerConection, data) => {
  while (!peerConection?.remoteDescription?.type) {
    await new Promise((r) => setTimeout(r, 50));
    console.log("waiting remote");
  }

  await peerConection.addIceCandidate(new RTCIceCandidate(data));
};

const initializeListeners = (currentUserId, loadUser) => {
  const dbRef = getDatabaseRef();
  const participantRef = child(dbRef, "participants");
  const receiverRef = child(participantRef, currentUserId);

  onChildAdded(child(receiverRef, "offers"), async (snap) => {
    const data = snap.val();

    if (data?.offerPayload) {
      const createrId = data?.offerPayload.userId;
      const participant = await loadUser(createrId);
      const peerConection = participant.peerConection;

      await peerConection.setRemoteDescription(
        new RTCSessionDescription(data?.offerPayload)
      );

      //create answer
      createAnswer(peerConection, currentUserId, createrId);
    }
  });

  onChildAdded(child(receiverRef, "offerCandidates"), async (snap) => {
    const data = snap.val();

    if (data?.userId) {
      const participant = await loadUser(data?.userId);
      const peerConection = participant.peerConection;

      await waitRemoteDesc(peerConection, data);
    }
  });

  onChildAdded(child(receiverRef, "answers"), async (snap) => {
    const data = snap.val();

    if (data.answerPayload) {
      const createrId = data?.answerPayload.userId;
      const participant = await loadUser(createrId);
      const peerConection = participant.peerConection;

      await peerConection.setRemoteDescription(
        new RTCSessionDescription(data?.answerPayload)
      );
    }
  });

  onChildAdded(child(receiverRef, "answerCandidates"), async (snap) => {
    const data = snap.val();

    if (data?.userId) {
      const participant = await loadUser(data?.userId);
      const peerConection = participant.peerConection;

      await waitRemoteDesc(peerConection, data);
    }
  });
};

const disconnectUser = () => {
  goOffline(getDatabase(app));
};

export {
  databaseListener,
  childListener,
  initializeListeners,
  createOffer,
  disconnectUser,
};
