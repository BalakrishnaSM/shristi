// src/components/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SymptomChecker from "./SymptomChecker";

const services = [
  { name: "Symptom Checker", icon: "🩺" },
  { name: "Book Appointment", icon: "📅" },
  { name: "Health Records", icon: "📁" },
  { name: "Voice Assistant", icon: "🎙️" },
  { name: "Medication Reminders", icon: "💊" },
  { name: "Emergency Help", icon: "🚨" },
];

const tips = [
  "Drink 8 glasses of water a day.",
  "Get at least 7 hours of sleep.",
  "Take a 10-min walk after meals.",
  "Wash your hands frequently.",
  "Practice mindfulness for stress relief.",
  "Don't skip breakfast!",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.2, duration: 0.5, ease: "easeOut" },
  }),
};

const cardVariants = {
  rest: { scale: 1, boxShadow: "0 6px 15px rgba(0,0,0,0.1)" },
  hover: {
    scale: 1.05,
    boxShadow: "0 12px 25px rgba(0,0,0,0.15)",
    transition: { duration: 0.3 },
  },
};

const Dashboard = () => {
  const [tip, setTip] = useState("");
  const navigate = useNavigate();
  const username = "Balakrishna S M";
  const [showSymptomChecker, setShowSymptomChecker] = useState(false);

  useEffect(() => {
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setTip(randomTip);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/", { replace: true });
  };

  return (
    <motion.main
      style={styles.container}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      aria-label="User Dashboard"
    >
      <header style={styles.header}>
        <section style={styles.userGreeting}>
          <h1 style={styles.greeting} tabIndex={0}>
            👋 Hello, {username}!
          </h1>
          <button
            onClick={handleLogout}
            style={styles.logoutBtn}
            aria-label="Logout"
            type="button"
          >
            Logout
          </button>
        </section>

        <section style={styles.branding} aria-label="App Branding">
          <h1 style={styles.brandTitle}>VoiceCare</h1>
          <h2 style={styles.brandSubtitle}>Vcare4U</h2>
        </section>
      </header>

      <motion.section
        style={styles.section}
        custom={0}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        aria-labelledby="health-tip-title"
      >
        <h2 id="health-tip-title" style={styles.sectionTitle}>
          💡 Health Tip of the Day
        </h2>
        <blockquote style={styles.tipBox} tabIndex={0}>
          {tip}
        </blockquote>
      </motion.section>

      <motion.section
        style={styles.section}
        custom={1}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        aria-labelledby="voice-shortcuts-title"
      >
        <h2 id="voice-shortcuts-title" style={styles.sectionTitle}>
          🎙️ Voice Shortcuts
        </h2>
        <p style={styles.shortcutText}>
          Try saying:{" "}
          <strong>"Check my symptoms"</strong> or{" "}
          <strong>"Remind me to take medicine at 8PM"</strong>
        </p>
      </motion.section>

      <motion.section
        style={styles.section}
        custom={2}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        aria-labelledby="services-title"
      >
        <h2 id="services-title" style={styles.sectionTitle}>
          🧩 Services
        </h2>
        <div style={styles.grid}>
          {services.map((service, idx) => (
            <motion.button
              key={idx}
              style={styles.card}
              variants={cardVariants}
              initial="rest"
              whileHover="hover"
              animate="rest"
              tabIndex={0}
              type="button"
              aria-label={`Open ${service.name}`}
              onClick={() => {
                if (service.name === "Symptom Checker") {
                  setShowSymptomChecker(true);
                } else {
                  alert(`You clicked ${service.name}`);
                }
              }}
            >
              <div style={styles.icon} aria-hidden="true">
                {service.icon}
              </div>
              <div style={styles.label}>{service.name}</div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* Render SymptomChecker Modal */}
      {showSymptomChecker && (
        <SymptomChecker onClose={() => setShowSymptomChecker(false)} />
      )}
    </motion.main>
  );
};

const styles = {
  container: {
    padding: "40px 60px",
    fontFamily: "'Poppins', sans-serif",
    backgroundColor: "#f5faff",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "50px",
    flexWrap: "wrap",
    gap: "20px",
  },
  userGreeting: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  greeting: {
    fontSize: "2.5rem",
    fontWeight: "700",
    color: "#0b3c5d",
    margin: 0,
    outlineOffset: "3px",
  },
  logoutBtn: {
    backgroundColor: "#ff4d4d",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "1.125rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
    outlineOffset: "3px",
  },
  branding: {
    textAlign: "right",
    minWidth: "160px",
  },
  brandTitle: {
    fontSize: "2.5rem",
    fontWeight: "700",
    color: "#0b3c5d",
    margin: "0 0 8px 0",
  },
  brandSubtitle: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#3a86ff",
    margin: 0,
  },
  section: {
    marginBottom: "48px",
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: "1.75rem",
    color: "#0b3c5d",
    marginBottom: "20px",
  },
  tipBox: {
    fontSize: "1.25rem",
    fontStyle: "italic",
    backgroundColor: "#d0f4de",
    padding: "20px 30px",
    borderRadius: "16px",
    color: "#2f5233",
    userSelect: "text",
  },
  shortcutText: {
    fontSize: "1.125rem",
    color: "#0b3c5d",
    backgroundColor: "#e3f2fd",
    padding: "15px 25px",
    borderRadius: "14px",
    userSelect: "text",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
    gap: "24px",
  },
  card: {
    backgroundColor: "#e0eefa",
    borderRadius: "20px",
    padding: "30px 20px",
    fontWeight: "600",
    fontSize: "1.125rem",
    cursor: "pointer",
    border: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    color: "#0b3c5d",
    userSelect: "none",
  },
  icon: {
    fontSize: "3rem",
    marginBottom: "12px",
  },
  label: {
    marginTop: "8px",
  },
};

export default Dashboard;
