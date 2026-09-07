import { useNavigate } from "react-router-dom";
import {
  FiMessageCircle,
  FiHome,
  FiArrowRight,
} from "react-icons/fi";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030303",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Top ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "-250px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "700px",
          height: "500px",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.07), transparent 65%)",
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      {/* Subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "linear-gradient(to bottom, black, transparent 80%)",
          pointerEvents: "none",
        }}
      />

      {/* Navbar */}
      <header
        style={{
          position: "relative",
          zIndex: 2,
          height: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(24px, 6vw, 90px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "21px",
            fontWeight: 700,
            letterSpacing: "-0.6px",
          }}
        >
          <img
            src="/logo.png"
            alt="WallChat"
            style={{
              width: "36px",
              height: "36px",
              objectFit: "contain",
              borderRadius: "11px",
            }}
          />

          WallChat
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          minHeight: "calc(100vh - 80px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 24px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "900px",
            textAlign: "center",
          }}
        >
          {/* Label */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              color: "#777",
              fontSize: "11px",
              letterSpacing: "5px",
              fontWeight: 500,
              marginBottom: "30px",
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "#777",
              }}
            />

            PAGE NOT FOUND
          </div>

          {/* 404 */}
          <div
            style={{
              position: "relative",
              fontSize: "clamp(140px, 27vw, 300px)",
              lineHeight: "0.75",
              fontWeight: 800,
              letterSpacing: "-0.08em",
              background:
                "linear-gradient(180deg, #ffffff 0%, #bdbdbd 25%, #3b3b3b 70%, #0d0d0d 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow:
                "0 30px 100px rgba(255,255,255,0.08)",
              userSelect: "none",
            }}
          >
            404
          </div>

          {/* Center message */}
          <div
            style={{
              maxWidth: "520px",
              margin: "55px auto 0",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(30px, 5vw, 46px)",
                lineHeight: 1.1,
                letterSpacing: "-1.8px",
                fontWeight: 650,
              }}
            >
              Looks like you're lost.
            </h1>

            <p
              style={{
                margin: "18px auto 0",
                maxWidth: "440px",
                color: "#707070",
                fontSize: "15px",
                lineHeight: 1.7,
              }}
            >
              The conversation you're looking for doesn't exist,
              or the page has moved somewhere else.
            </p>

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                marginTop: "34px",
                flexWrap: "wrap",
              }}
            >
              {/* Home */}
              <button
                onClick={() => navigate("/")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "9px",
                  padding: "13px 22px",
                  borderRadius: "12px",
                  border: "1px solid #fff",
                  background: "#fff",
                  color: "#000",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow:
                    "0 8px 30px rgba(255,255,255,0.08)",
                }}
              >
                <FiHome size={17} />
                Go Home
              </button>

              {/* Chat */}
              <button
                onClick={() => navigate("/chat")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "9px",
                  padding: "13px 22px",
                  borderRadius: "12px",
                  border: "1px solid #292929",
                  background:
                    "linear-gradient(180deg, #151515, #0b0b0b)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  boxShadow:
                    "inset 0 1px rgba(255,255,255,0.05), 0 10px 35px rgba(0,0,0,0.4)",
                }}
              >
                <FiMessageCircle size={17} />
                Go to Chat
                <FiArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Bottom decorative line */}
          <div
            style={{
              margin: "80px auto 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "70px",
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent, #333)",
              }}
            />

            <span
              style={{
                color: "#333",
                fontSize: "10px",
                letterSpacing: "4px",
                textTransform: "uppercase",
              }}
            >
              WallChat
            </span>

            <div
              style={{
                width: "70px",
                height: "1px",
                background:
                  "linear-gradient(90deg, #333, transparent)",
              }}
            />
          </div>
        </div>
      </main>

      {/* Bottom corner glow */}
      <div
        style={{
          position: "absolute",
          bottom: "-250px",
          left: "-150px",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.035), transparent 65%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}