import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiShuffle,
  FiVideo,
  FiUsers,
} from "react-icons/fi";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.landing}>
      {/* =========================
          NAVBAR
      ========================= */}

      <nav className={styles.nav}>
        <div className={styles.brand}>
          <img src="/logo.png" alt="WallChat" />
          <span>WallChat</span>
        </div>
      </nav>

      {/* =========================
          HERO
      ========================= */}

      <main className={styles.hero}>
        <div className={styles.eyebrow}>
          <span className={styles.statusDot}></span>
          Talk to anyone. Anywhere.
        </div>

        <h1>
          Start a conversation
          <br />
          <span>your way.</span>
        </h1>

        <p>
          Meet someone random or connect directly with a friend.
          <br />
          No accounts. No profiles. Just real-time conversations.
        </p>

        {/* =========================
            CHAT OPTIONS
        ========================= */}

        <div className={styles.chatOptions}>
          <button
            className={`${styles.chatButton} ${styles.randomButton}`}
            onClick={() => navigate("/chat")}
          >
            <div className={styles.buttonIcon}>
              <FiShuffle />
            </div>

            <div className={styles.buttonContent}>
              <strong>Chat with Random People</strong>
              <span>Meet someone new instantly</span>
            </div>

            <FiArrowRight className={styles.buttonArrow} />
          </button>

          <button
            className={`${styles.chatButton} ${styles.personalButton}`}
            onClick={() => navigate("/personal-room")}
          >
            <div className={styles.buttonIcon}>
              <FiUsers />
            </div>

            <div className={styles.buttonContent}>
              <strong>Chat with Your Person</strong>
              <span>Connect using their Socket ID</span>
            </div>

            <FiArrowRight className={styles.buttonArrow} />
          </button>
        </div>

        {/* =========================
            FEATURES
        ========================= */}

        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <FiShuffle />
            </div>

            <div>
              <h3>Random Matching</h3>
              <p>Meet someone new instantly</p>
            </div>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <FiUsers />
            </div>

            <div>
              <h3>Private Rooms</h3>
              <p>Connect with a specific person</p>
            </div>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <FiVideo />
            </div>

            <div>
              <h3>Video Chat</h3>
              <p>Talk face to face in real time</p>
            </div>
          </div>
        </div>
      </main>

      {/* =========================
          BACKGROUND
      ========================= */}

      <div className={styles.grid}></div>

      <div className={`${styles.glow} ${styles.glowTop}`}></div>
      <div className={`${styles.glow} ${styles.glowBottom}`}></div>

      {/* =========================
          FOOTER
      ========================= */}

      <footer className={styles.footer}>
        <span>WALLCHAT</span>

        <div>
          <span>CONNECT</span>
          <span className={styles.separator}>•</span>
          <span>CHAT</span>
          <span className={styles.separator}>•</span>
          <span>DISCOVER</span>
        </div>
      </footer>
    </div>
  );
}
