import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiVolume2,
  FiVolumeX,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
  FiPhoneOff,
  FiMessageCircle,
  FiX,
  FiSend,
} from "react-icons/fi";
import styles from "./Chat.module.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const socket = io(BACKEND_URL);

function Chat() {
  const navigate = useNavigate();

  const [status, setStatus] = useState("Waiting...");
  const [myAudioOn, setMyAudioOn] = useState(true);
  const [myVideoOn, setMyVideoOn] = useState(true);
  const [otherMuted, setOtherMuted] = useState(false);
  const [otherVideoHidden, setOtherVideoHidden] = useState(false);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showMessages, setShowMessages] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const myVideoRef = useRef(null);
  const otherVideoRef = useRef(null);
  const myStream = useRef(null);
  const peerConnection = useRef(null);
  const peerId = useRef(null);

  const cleanWebRTC = () => {
    try {
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }

      if (myStream.current) {
        myStream.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (error) {
            console.error("TRACK STOP ERROR:", error);
          }
        });

        myStream.current = null;
      }

      if (myVideoRef.current) {
        myVideoRef.current.srcObject = null;
      }

      if (otherVideoRef.current) {
        otherVideoRef.current.srcObject = null;
      }

      peerId.current = null;
    } catch (error) {
      console.error("CLEANUP ERROR:", error);
    }
  };

  // Called when the RTCPeerConnection itself reports "disconnected" or
  // "failed" (network drop, peer crashed, etc — not our own intentional
  // pc.close(), which reports "closed" and is ignored below). Behaves like
  // an automatic requeue, so the user isn't left stuck.
  //
  // Note: we don't also emit "end-call" here. The backend's "find-person"
  // handler already looks up the current peer, notifies them with
  // "peer-disconnected", and clears the relationship before matching —
  // so emitting "end-call" first would just do that same teardown twice.
  const handleConnectionLost = () => {
    cleanWebRTC();
    setMessages([]);
    setStatus("Waiting...");
    socket.emit("find-person");
  };

  useEffect(() => {
    const handleMatched = async ({ peerId: id, initiator }) => {
      try {
        peerId.current = id;
        setStatus("User found");
        setMessages([]);
        // reset toggles for the new match
        setOtherMuted(false);
        setOtherVideoHidden(false);
        setMyAudioOn(true);
        setMyVideoOn(true);

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        peerConnection.current = pc;

        // Fires on real network drops ("disconnected"/"failed"). Our own
        // intentional pc.close() (see cleanWebRTC) reports "closed", which
        // is deliberately not handled here so ending a call normally
        // doesn't also trigger an automatic re-match.
        pc.onconnectionstatechange = () => {
          if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed"
          ) {
            console.warn("Peer connection lost:", pc.connectionState);
            handleConnectionLost();
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        myStream.current = stream;

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
          try {
            // otherVideoRef stays mounted at all times (see render below),
            // so this always has somewhere to attach the stream even if
            // the "hide other video" toggle is currently on.
            if (otherVideoRef.current) {
              otherVideoRef.current.srcObject = event.streams[0];
              otherVideoRef.current.muted = otherMuted;
            }

            setStatus("Connected");
          } catch (error) {
            console.error("ONTRACK ERROR:", error);
            handleConnectionLost();
          }
        };

        pc.onicecandidate = (event) => {
          try {
            if (event.candidate && peerId.current) {
              socket.emit("ice-candidate", {
                candidate: event.candidate,
                peerId: peerId.current,
              });
            }
          } catch (error) {
            console.error("ICE SEND ERROR:", error);
            handleConnectionLost();
          }
        };

        if (initiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("offer", {
            offer,
            peerId: peerId.current,
          });
        }
      } catch (error) {
        console.error("MATCH ERROR:", error);
        handleConnectionLost();
      }
    };

    const handleOffer = async ({ offer, peerId: id }) => {
      try {
        peerId.current = id;

        const pc = peerConnection.current;

        if (!pc) {
          throw new Error("No PeerConnection available");
        }

        await pc.setRemoteDescription(offer);

        const answer = await pc.createAnswer();

        await pc.setLocalDescription(answer);

        socket.emit("answer", {
          answer,
          peerId: peerId.current,
        });
      } catch (error) {
        console.error("OFFER ERROR:", error);
        handleConnectionLost();
      }
    };

    const handleAnswer = async ({ answer }) => {
      try {
        const pc = peerConnection.current;

        if (!pc) {
          throw new Error("No PeerConnection available");
        }

        await pc.setRemoteDescription(answer);
      } catch (error) {
        console.error("ANSWER ERROR:", error);
        handleConnectionLost();
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        const pc = peerConnection.current;

        if (!pc) {
          throw new Error("No PeerConnection available");
        }

        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.error("ICE ERROR:", error);
        handleConnectionLost();
      }
    };

    const handlePeerDisconnected = () => {
      setStatus("Waiting...");
      cleanWebRTC();
      setMessages([]);
      socket.emit("find-person");
    };

    const handleReceiveMessage = ({ message }) => {
      setMessages((old) => [
        ...old,
        {
          id: Date.now(),
          message,
          own: false,
        },
      ]);

      setHasUnread(true);
    };

    socket.on("matched", handleMatched);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("peer-disconnected", handlePeerDisconnected);
    socket.on("receive-message", handleReceiveMessage);

    socket.emit("find-person");

    return () => {
      socket.off("matched", handleMatched);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("peer-disconnected", handlePeerDisconnected);
      socket.off("receive-message", handleReceiveMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endCall = () => {
    socket.emit("end-call");
    cleanWebRTC();
    setMessages([]);
    setStatus("Waiting...");
    navigate("/");
  };

  // "Change person" doesn't need its own "end-call" emit — the backend's
  // "find-person" handler already looks up peers.get(socket.id), notifies
  // that peer with "peer-disconnected", clears the relationship, and then
  // tries to match us with someone new, all in one round trip.
  const changePerson = () => {
    cleanWebRTC();
    setMessages([]);
    setStatus("Waiting...");
    socket.emit("find-person");
  };

  const toggleMyAudio = () => {
    const track = myStream.current?.getAudioTracks()[0];

    if (!track) {
      console.log("No microphone track found");
      return;
    }

    track.enabled = !track.enabled;
    setMyAudioOn(track.enabled);
  };

  const toggleMyVideo = () => {
    const track = myStream.current?.getVideoTracks()[0];

    if (!track) {
      console.log("No camera track found");
      return;
    }

    track.enabled = !track.enabled;
    setMyVideoOn(track.enabled);
  };

  // FIX: previously this read/wrote otherVideoRef.current.muted directly.
  // That broke once the <video> unmounted (see hide-video note below), and
  // it went out of sync with React state on re-renders. Now it's plain
  // state, and the "muted" prop is bound to that state on the element.
  const muteOther = () => {
    setOtherMuted((old) => !old);
  };

  // FIX: this used to conditionally render the stranger's <video> element
  // out of the DOM entirely. Since pc.ontrack only fires once per stream,
  // remounting a fresh <video> later never got srcObject re-attached and
  // the feed stayed black. The element now always stays mounted; we just
  // toggle a CSS class/overlay on top of it so the ref (and its stream)
  // survive the toggle, same idea as the "camera off" overlay already used
  // for my own video below.
  const toggleOtherVideo = () => {
    setOtherVideoHidden((old) => !old);
  };

  const sendMessage = () => {
    if (!text.trim()) return;

    socket.emit("send-message", {
      message: text,
    });

    setMessages((old) => [
      ...old,
      {
        id: Date.now(),
        message: text,
        own: true,
      },
    ]);

    setText("");
  };

  const toggleMessages = () => {
    setShowMessages((old) => !old);
    setHasUnread(false);
  };

  const isWaitingForPeer = status !== "Connected";

  return (
    <div className={styles.page}>
      {/* HEADER — same branding as the landing page, real layout space
          (not floating over the video) */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <img src="/logo.png" alt="WallChat" className={styles.brandLogo} />
          <span className={styles.brandName}>WallChat</span>
        </div>

        <div className={styles.statusPill}>
          <span
            className={`${styles.dot} ${
              status === "Connected" ? styles.dotLive : ""
            }`}
          />
          {status}
        </div>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={toggleMessages}
          aria-label="Toggle messages"
        >
          <FiMessageCircle />
          {hasUnread && <span className={styles.unreadDot} />}
        </button>
      </header>

      <div className={styles.callScreen}>
        {/* LEFT SIDE — MY VIDEO + MY CONTROLS */}
        <div className={styles.myPane}>
          <div className={styles.paneLabel}>
            <span className={styles.paneLabelDot} />
            You
          </div>

          <div className={styles.videoFrame}>
            <video
              ref={myVideoRef}
              autoPlay
              playsInline
              muted
              className={`${styles.video} ${!myVideoOn ? styles.dimmed : ""}`}
            />

            {!myVideoOn && (
              <div className={styles.overlay}>
                <FiVideoOff size={26} />
                <span>Camera off</span>
              </div>
            )}
          </div>

          <div className={styles.paneControls}>
            <button
              type="button"
              className={styles.ctrlBtn}
              onClick={toggleMyAudio}
              aria-label="Toggle my microphone"
            >
              {myAudioOn ? <FiMic /> : <FiMicOff />}
            </button>

            <button
              type="button"
              className={styles.ctrlBtn}
              onClick={toggleMyVideo}
              aria-label="Toggle my camera"
            >
              {myVideoOn ? <FiVideo /> : <FiVideoOff />}
            </button>
          </div>
        </div>

        {/* RIGHT SIDE — STRANGER VIDEO + STRANGER CONTROLS */}
        <div className={styles.otherPane}>
          <div className={styles.paneLabel}>
            <span className={styles.paneLabelDot} />
            Stranger
          </div>

          <div className={styles.videoFrame}>
            {/* Always mounted — visibility is purely a CSS overlay so the
              srcObject attached in pc.ontrack is never lost. */}
            <video
              ref={otherVideoRef}
              autoPlay
              playsInline
              muted={otherMuted}
              className={`${styles.video} ${
                otherVideoHidden ? styles.blackout : ""
              }`}
            />

            {isWaitingForPeer ? (
              <div className={styles.overlay}>
                <span className={styles.spinner} />
                <span>
                  {status === "User found"
                    ? "Connecting..."
                    : "Looking for someone to talk to..."}
                </span>
              </div>
            ) : (
              otherVideoHidden && (
                <div className={`${styles.overlay} ${styles.overlaySolid}`}>
                  <FiEyeOff size={26} />
                  <span>Video hidden</span>
                </div>
              )
            )}
          </div>

          <div className={styles.paneControls}>
            <button
              type="button"
              className={styles.ctrlBtn}
              onClick={muteOther}
              disabled={isWaitingForPeer}
              aria-label="Mute stranger's audio"
            >
              {otherMuted ? <FiVolumeX /> : <FiVolume2 />}
            </button>

            <button
              type="button"
              className={styles.ctrlBtn}
              onClick={toggleOtherVideo}
              disabled={isWaitingForPeer}
              aria-label="Hide stranger's video"
            >
              {otherVideoHidden ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        {/* TOP BAR — STATUS + MESSAGE TOGGLE */}

        {/* BOTTOM CENTER — CHANGE / END CALL */}
        <div className={styles.bottomBar}>
          <button
            type="button"
            className={styles.pillBtn}
            onClick={changePerson}
            aria-label="Find a new person"
          >
            <FiRefreshCw />
            <span>New person</span>
          </button>

          <button
            type="button"
            className={`${styles.pillBtn} ${styles.pillDanger}`}
            onClick={endCall}
            aria-label="End call"
          >
            <FiPhoneOff />
            <span>End call</span>
          </button>
        </div>
      </div>
      {/* callScreen ends here — header + callScreen are siblings under .page */}

      {/* MESSAGE DRAWER — SLIDES IN FROM THE RIGHT */}
      <div
        className={`${styles.messageDrawer} ${
          showMessages ? styles.drawerOpen : ""
        }`}
      >
        <div className={styles.messageDrawerHeader}>
          <span>Messages</span>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleMessages}
            aria-label="Close messages"
          >
            <FiX />
          </button>
        </div>

        <div className={styles.messageList}>
          {messages.length === 0 && (
            <div className={styles.emptyMsg}>No messages yet</div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.own
                  ? `${styles.bubble} ${styles.own}`
                  : `${styles.bubble} ${styles.other}`
              }
            >
              {msg.message}
            </div>
          ))}
        </div>

        <div className={styles.messageInputBar}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
          />

          <button type="button" onClick={sendMessage} disabled={!text.trim()}>
            <FiSend />
          </button>
        </div>
      </div>

      {/* click-outside backdrop for the drawer, mobile-friendly */}
      {showMessages && (
        <div className={styles.drawerBackdrop} onClick={toggleMessages} />
      )}
    </div>
  );
}

export default Chat;
