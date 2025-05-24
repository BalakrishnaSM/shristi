import React, { useEffect, useState } from "react";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const LoginPage = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => setUser(tokenResponse),
    onError: (error) => console.error("Login Failed:", error),
  });

  useEffect(() => {
    if (user) {
      axios
        .get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${user.access_token}` },
        })
        .then((res) => {
          setProfile(res.data);
          navigate("/dashboard"); // redirect after login
        })
        .catch((err) => console.error(err));
    }
  }, [user]);

  return (
    <div style={styles.container}>
      {/* Left Visual */}
      <div style={styles.left}>
        <img
          src="https://images.fineartamerica.com/images-medium-large-5/health-care-leon-zernitsky.jpg"
          alt="VoiceCare"
          style={styles.image}
        />
      </div>

      {/* Right Login Panel */}
      <div style={styles.right}>
        <div style={styles.card}>
          <h1 style={styles.title}>🩺 VoiceCare</h1>
          <p style={styles.tagline}>Your voice-powered health companion.</p>
          <p style={styles.tagline}>Accessible. Multilingual. Intelligent.</p>
          <p style={styles.tagline}>Empowering every voice in healthcare.</p>

          {!profile ? (
            <button onClick={login} style={styles.googleBtn}>
              Sign in with Google
            </button>
          ) : (
            <div style={styles.profileBox}>
              <img src={profile.picture} alt="avatar" style={styles.avatar} />
              <h3 style={styles.name}>{profile.name}</h3>
              <p style={styles.email}>{profile.email}</p>
              <button
                onClick={() => {
                  googleLogout();
                  setProfile(null);
                }}
                style={styles.logoutBtn}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    fontFamily: "'Poppins', sans-serif",
  },
  left: {
    flex: 1,
    background: "linear-gradient(to bottom right, #9be7e3,rgb(72, 92, 241))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  right: {
    flex: 1,
    background: "linear-gradient(to bottom right,rgb(77, 164, 235),rgb(128, 157, 254))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 40px",
  },
  card: {
    background: "rgba(255, 255, 255, 0.97)",
    padding: "50px 40px",
    borderRadius: "24px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
    maxWidth: "480px",
    width: "100%",
    textAlign: "center",
  },
  title: {
    fontSize: "45px",
    fontWeight: "700",
    color: "#2a4d3c",
    marginBottom: "20px",
  },
  tagline: {
    fontSize: "22px",
    color: "#4b4b4b",
    marginBottom: "6px",
    fontStyle: "italic",
  },
  googleBtn: {
    marginTop: "30px",
    padding: "14px 28px",
    fontSize: "19px",
    backgroundColor: "#4285F4",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "0.3s",
  },
  logoutBtn: {
    marginTop: "20px",
    padding: "12px 24px",
    backgroundColor: "#d9534f",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
  },
  profileBox: {
    marginTop: "20px",
  },
  avatar: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    marginBottom: "10px",
  },
  name: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#333",
  },
  email: {
    color: "#666",
  },
};

export default LoginPage;
