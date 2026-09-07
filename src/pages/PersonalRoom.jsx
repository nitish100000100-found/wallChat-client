import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaVolumeUp,
  FaVolumeMute,
  FaEye,
  FaEyeSlash,
  FaPaperPlane,
  FaComments,
  FaTimes,
} from "react-icons/fa";
import styles from "./PersonalRoom.module.css";

const URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export default function PersonalRoom() {
  const navigate = useNavigate();

  const socket = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const messagesEndRef = useRef(null);

  const [myId, setMyId] = useState("");
  const [friendId, setFriendId] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [friendAudioOn, setFriendAudioOn] = useState(true);
  const [friendVideoOn, setFriendVideoOn] = useState(true);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState(false);

  useEffect(() => {
    const s = io(URL);
    socket.current = s;

    s.on("connect", () => {
      setMyId(s.id);
    });

    s.on("friend-connected", async ({ peerId, initiator }) => {
      setError("");
      await startMedia();

      if (initiator) {
        createOffer(peerId);
      }
    });

    s.on("friend-connect-error", ({ message }) => {
      setError(message);
    });

    s.on("yourfriend-offer", async ({ offer, peerId }) => {
      await startMedia();

      const pc = createPeer(peerId);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      s.emit("yourfriend-answer", {
        answer,
        peerId,
      });
    });

    s.on("yourfriend-answer", async ({ answer }) => {
      if (!peerConnection.current) return;

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer),
      );
    });

    s.on("yourfriend-ice-candidate", async ({ candidate }) => {
      if (!peerConnection.current || !candidate) return;

      try {
        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate),
        );
      } catch (err) {
        console.error("ICE error:", err);
      }
    });

    s.on("yourfriend-message", ({ message, senderId }) => {
      setMessages((prev) => [...prev, { message, senderId }]);
      setNewMessage(true);
    });

    s.on("peer-disconnected", () => {
      cleanupCall();
      setMessages([]);
      setChatOpen(false);
      setNewMessage(false);
      navigate("/");
    });

    return () => {
      localStream.current?.getTracks().forEach((track) => {
        track.stop();
      });

      peerConnection.current?.close();
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const startMedia = async () => {
    if (localStream.current) {
      return localStream.current;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStream.current = stream;

      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }

      return stream;
    } catch (err) {
      console.error(err);
      setError("Camera or microphone permission is required.");
    }
  };

  const createPeer = (peerId) => {
    if (peerConnection.current) {
      return peerConnection.current;
    }

    const pc = new RTCPeerConnection();
    peerConnection.current = pc;

    localStream.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream.current);
    });

    pc.ontrack = ({ streams }) => {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = streams[0];
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;

      socket.current.emit("yourfriend-ice-candidate", {
        candidate,
        peerId,
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnected(true);
        setError("");
      }

      if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
        setConnected(false);
      }
    };

    return pc;
  };

  const createOffer = async (peerId) => {
    try {
      const pc = createPeer(peerId);
      const offer = await pc.createOffer();

      await pc.setLocalDescription(offer);

      socket.current.emit("yourfriend-offer", {
        offer,
        peerId,
      });
    } catch (err) {
      console.error("Offer error:", err);
      setError("Could not start video call.");
    }
  };

  const connectFriend = (e) => {
    e.preventDefault();

    const id = friendId.trim();

    if (!id) {
      setError("Enter your friend's ID.");
      return;
    }

    setError("");

    socket.current.emit("connect-with-friend", {
      friendId: id,
    });
  };

  const toggleAudio = () => {
    const track = localStream.current?.getAudioTracks()[0];

    if (!track) return;

    track.enabled = !track.enabled;
    setAudioOn(track.enabled);
  };

  const toggleVideo = () => {
    const track = localStream.current?.getVideoTracks()[0];

    if (!track) return;

    track.enabled = !track.enabled;
    setVideoOn(track.enabled);
  };

  const toggleFriendAudio = () => {
    if (!remoteVideo.current) return;

    remoteVideo.current.muted = !remoteVideo.current.muted;

    setFriendAudioOn(!remoteVideo.current.muted);
  };

  const toggleFriendVideo = () => {
    if (!remoteVideo.current) return;

    const visible = !friendVideoOn;

    remoteVideo.current.style.visibility = visible ? "visible" : "hidden";

    setFriendVideoOn(visible);
  };

  const sendMessage = () => {
    const text = message.trim();

    if (!text) return;

    socket.current?.emit("yourfriend-message", {
      message: text,
    });

    setMessages((prev) => [
      ...prev,
      {
        message: text,
        senderId: myId,
      },
    ]);

    setMessage("");
  };

  const toggleChat = () => {
    setChatOpen((prev) => !prev);
    setNewMessage(false);
  };

  const cleanupCall = () => {
    if (remoteVideo.current) {
      remoteVideo.current.srcObject = null;
    }

    localStream.current?.getTracks().forEach((track) => {
      track.stop();
    });

    localStream.current = null;

    peerConnection.current?.close();
    peerConnection.current = null;

    setConnected(false);
  };

  const endCall = () => {
    socket.current?.emit("yourfriend-end-call");

    cleanupCall();

    setMessages([]);
    setChatOpen(false);
    setNewMessage(false);

    navigate("/");
  };

  return (
    <div className={styles.personalRoom}>
      <header className={styles.roomHeader}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="WallChat" />
          <span>WallChat</span>
        </div>

        <div className={styles.connectionStatus}>
          <span className={styles.statusDot} />
          <span>{connected ? "CONNECTED" : "CONNECTING"}</span>
        </div>

        {connected && (
          <button
            className={`${styles.messageButton} ${
              newMessage ? styles.messageGlow : ""
            }`}
            onClick={toggleChat}
            title="Messages"
          >
            {chatOpen ? <FaTimes /> : <FaComments />}

            {newMessage && <span className={styles.messageBadge} />}
          </button>
        )}
      </header>

      <main className={styles.videoArea}>
        <div className={styles.videoCard}>
          <video ref={localVideo} autoPlay muted playsInline />

          <span className={styles.videoLabel}>YOU</span>

          {connected && (
            <div className={styles.controls}>
              <button
                className={audioOn ? styles.controlButton : styles.controlOff}
                onClick={toggleAudio}
                title={audioOn ? "Mute microphone" : "Unmute microphone"}
              >
                {audioOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>

              <button
                className={videoOn ? styles.controlButton : styles.controlOff}
                onClick={toggleVideo}
                title={videoOn ? "Turn camera off" : "Turn camera on"}
              >
                {videoOn ? <FaVideo /> : <FaVideoSlash />}
              </button>
            </div>
          )}
        </div>

        <div className={styles.videoCard}>
          {!connected && (
            <div className={styles.waiting}>
              <div className={styles.loader} />
              <p>Waiting for your friend...</p>
            </div>
          )}

          <video ref={remoteVideo} autoPlay playsInline />

          {connected && (
            <>
              <span className={styles.videoLabel}>FRIEND</span>

              <div className={styles.controls}>
                <button
                  className={
                    friendAudioOn ? styles.controlButton : styles.controlOff
                  }
                  onClick={toggleFriendAudio}
                  title={friendAudioOn ? "Mute friend" : "Unmute friend"}
                >
                  {friendAudioOn ? <FaVolumeUp /> : <FaVolumeMute />}
                </button>

                <button
                  className={
                    friendVideoOn ? styles.controlButton : styles.controlOff
                  }
                  onClick={toggleFriendVideo}
                  title={
                    friendVideoOn
                      ? "Hide friend's video"
                      : "Show friend's video"
                  }
                >
                  {friendVideoOn ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {connected && chatOpen && (
        <aside className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <div>
              <span className={styles.chatTitle}>Messages</span>

              <span className={styles.chatSubtitle}>Your conversation</span>
            </div>

            <button
              className={styles.closeChat}
              onClick={toggleChat}
              title="Close messages"
            >
              <FaTimes />
            </button>
          </div>

          <div className={styles.messages}>
            {messages.length === 0 ? (
              <div className={styles.emptyMessages}>No messages yet</div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={
                    msg.senderId === myId
                      ? styles.myMessage
                      : styles.friendMessage
                  }
                >
                  {msg.message}
                </div>
              ))
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className={styles.messageInputArea}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
            />

            <button onClick={sendMessage} title="Send message">
              <FaPaperPlane />
            </button>
          </div>
        </aside>
      )}

      {!connected && (
        <div className={styles.connectOverlay}>
          <div className={styles.connectCard}>
            <h2>Personal Room</h2>

            <p>
              Share your ID with your friend,
              <br />
              or enter your friend's ID.
            </p>

            {error && <div className={styles.error}>{error}</div>}

            <label>Your ID</label>

            <div className={styles.myId}>{myId || "Connecting..."}</div>

            <div className={styles.or}>OR</div>

            <label>Friend's ID</label>

            <form onSubmit={connectFriend}>
              <input
                type="text"
                value={friendId}
                onChange={(e) => {
                  setFriendId(e.target.value);
                  setError("");
                }}
                placeholder="Enter friend's socket ID"
              />

              <button type="submit">Connect</button>
            </form>
          </div>
        </div>
      )}

      {connected && (
        <button className={styles.endCall} onClick={endCall}>
          End Call
        </button>
      )}
    </div>
  );
}
