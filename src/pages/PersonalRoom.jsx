import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
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

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

function PersonalRoom() {
  const navigate = useNavigate();

  const socket = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);

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

  // =========================
  // CLEANUP
  // =========================

  const cleanWebRTC = () => {
    if (remoteVideo.current) {
      remoteVideo.current.srcObject = null;
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    setConnected(false);
  };

  // Local teardown + tell the server we're leaving + go home.
  // Use this for anything WE initiate (end call button, connection
  // failing/dropping on our end, closing the tab). Do NOT use this
  // for the "peer-disconnected" socket event or the unmount cleanup -
  // those don't need to (re)notify the server or force a navigate.
  const leaveCall = () => {
    socket.current?.emit("end-call");
    cleanWebRTC();
    navigate("/");
  };

  // =========================
  // MAIN SOCKET + WEBRTC FLOW
  // =========================

  useEffect(() => {
    const s = io(BACKEND_URL);
    socket.current = s;

    s.on("connect", () => {
      setMyId(s.id);
    });

    // ---- FRIEND CONNECTED: set up the peer connection here, once ----
    s.on("friend-connected", async ({ peerId, initiator }) => {
      try {
        setError("");

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        peerConnection.current = pc;

        // Get camera + mic
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        localStream.current = stream;

        if (localVideo.current) {
          localVideo.current.srcObject = stream;
        }

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideo.current) {
            remoteVideo.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            s.emit("ice-candidate", { candidate: event.candidate, peerId });
          }
        };

        // This is the key fix: actually flip "connected" on when WebRTC connects
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setConnected(true);
            setError("");
          }

          if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
            leaveCall();
          }
        };

        // Only the initiator makes the offer
        if (initiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          s.emit("offer", { offer, peerId });
        }
      } catch (err) {
        console.error("Friend connection error:", err);
        setError("Camera or microphone permission is required.");
        cleanWebRTC();
      }
    });

    s.on("friend-connect-error", ({ message }) => {
      setError(message);
    });

    // ---- OFFER (answering side) ----
    s.on("offer", async ({ offer, peerId }) => {
      try {
        const pc = peerConnection.current;
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        s.emit("answer", { answer, peerId });
      } catch (err) {
        console.error("Offer error:", err);
      }
    });

    // ---- ANSWER ----
    s.on("answer", async ({ answer }) => {
      try {
        const pc = peerConnection.current;
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Answer error:", err);
      }
    });

    // ---- ICE CANDIDATE ----
    s.on("ice-candidate", async ({ candidate }) => {
      try {
        const pc = peerConnection.current;
        if (!pc || !candidate) return;

        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("ICE candidate error:", err);
      }
    });

    // ---- CHAT ----
    s.on("receive-message", ({ message, senderId }) => {
      setMessages((prev) => [...prev, { message, senderId }]);
      setNewMessage(true);
    });

    // ---- PEER LEFT ----
    s.on("peer-disconnected", () => {
      cleanWebRTC();
      setMessages([]);
      setChatOpen(false);
      setNewMessage(false);
      navigate("/");
    });

    return () => {
      cleanWebRTC();
      s.disconnect();
    };
  }, []);

  // =========================
  // TAB VISIBILITY / UNLOAD
  // =========================

  useEffect(() => {
    const endIfActive = () => {
      if (peerConnection.current) {
        leaveCall();
        socket.current?.disconnect();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        endIfActive();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", endIfActive);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", endIfActive);
    };
  }, []);

  // =========================
  // CONNECT WITH FRIEND
  // =========================

  const connectFriend = (e) => {
    e.preventDefault();

    const id = friendId.trim();

    if (!id) {
      setError("Enter your friend's ID.");
      return;
    }

    setError("");
    socket.current?.emit("connect-with-friend", { friendId: id });
  };

  // =========================
  // CONTROLS
  // =========================

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
    setFriendVideoOn((prev) => !prev);
  };

  const sendMessage = () => {
    const text = message.trim();
    if (!text) return;

    socket.current?.emit("send-message", { message: text });

    setMessages((prev) => [...prev, { message: text, senderId: myId }]);
    setMessage("");
  };

  const toggleChat = () => {
    setChatOpen((prev) => !prev);
    setNewMessage(false);
  };

  const endCall = () => {
    setMessages([]);
    setChatOpen(false);
    setNewMessage(false);

    leaveCall();
  };

  // =========================
  // RENDER
  // =========================

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
            className={`${styles.messageButton} ${newMessage ? styles.messageGlow : ""}`}
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
              <p>{error || "Waiting for your friend..."}</p>
            </div>
          )}

          <video
            ref={remoteVideo}
            autoPlay
            playsInline
            style={{ visibility: friendVideoOn ? "visible" : "hidden" }}
          />

          {connected && (
            <>
              <span className={styles.videoLabel}>FRIEND</span>

              <div className={styles.controls}>
                <button
                  className={friendAudioOn ? styles.controlButton : styles.controlOff}
                  onClick={toggleFriendAudio}
                  title={friendAudioOn ? "Mute friend" : "Unmute friend"}
                >
                  {friendAudioOn ? <FaVolumeUp /> : <FaVolumeMute />}
                </button>

                <button
                  className={friendVideoOn ? styles.controlButton : styles.controlOff}
                  onClick={toggleFriendVideo}
                  title={friendVideoOn ? "Hide friend's video" : "Show friend's video"}
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

            <button className={styles.closeChat} onClick={toggleChat} title="Close messages">
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
                  className={msg.senderId === myId ? styles.myMessage : styles.friendMessage}
                >
                  {msg.message}
                </div>
              ))
            )}
          </div>

          <div className={styles.messageInputArea}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
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

export default PersonalRoom;
