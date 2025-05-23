// src/pages/AppointmentBooking.jsx
import React, { useState } from "react";
import axios from "axios";

export default function AppointmentBooking() {
  const [audioFile, setAudioFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setAudioFile(e.target.files[0]);
  };

  const handleMicRecord = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/wav" });
      const file = new File([blob], "appointment.wav", { type: "audio/wav" });
      setAudioFile(file);
      setRecording(false);
    };

    mediaRecorder.start();
    setRecording(true);

    setTimeout(() => {
      mediaRecorder.stop();
    }, 5000); // 5 seconds
  };

  const handleSubmit = async () => {
    if (!audioFile) return;
    setLoading(true);
    setError(null);
    setConfirmation(null);

    const formData = new FormData();
    formData.append("audio", audioFile);

    try {
      const response = await axios.post("http://localhost:5000/api/appointment/book", formData);
      setConfirmation(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to book appointment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📅 Voice Appointment Booking</h2>

      <div className="flex gap-4 mb-4">
        <input type="file" accept="audio/*" onChange={handleFileChange} />
        <button
          onClick={handleMicRecord}
          disabled={recording}
          className="bg-blue-500 text-white px-4 py-2 rounded shadow"
        >
          🎤 {recording ? "Recording..." : "Record via Mic"}
        </button>
        <button
          onClick={handleSubmit}
          className="bg-green-600 text-white px-4 py-2 rounded shadow"
        >
          📤 Submit
        </button>
      </div>

      {loading && <p className="text-gray-600">⏳ Processing...</p>}
      {error && <p className="text-red-500">❌ {error}</p>}
      {confirmation && (
        <div className="bg-green-100 p-4 rounded shadow">
          <h3 className="text-lg font-semibold">✅ Appointment Booked</h3>
          <p><strong>Specialist:</strong> {confirmation.specialist}</p>
          <p><strong>Time:</strong> {confirmation.time}</p>
          <a
            href={confirmation.calendarLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            📆 View in Google Calendar
          </a>
        </div>
      )}
    </div>
  );
}
