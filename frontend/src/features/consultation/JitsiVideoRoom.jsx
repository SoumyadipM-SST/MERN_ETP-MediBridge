import { useEffect, useRef, useState } from "react";

import { useApp } from "../../hooks/useApp.js";
import { api } from "../../services/api.js";
import { loadJitsi } from "../../services/jitsi.js";

export default function JitsiVideoRoom({ appointment, onClose }) {
  const { user } = useApp();
  const host = useRef(null);
  const [status, setStatus] = useState("Connecting to video consultation…");

  useEffect(() => {
    let disposed = false,
      meeting,
      deadlineTimer,
      connected = false;
    const stopMeeting = () => {
      if (!meeting) return;
      try {
        meeting.executeCommand("hangup");
      } catch {
        /* The frame may already have left. */
      }
      meeting.dispose();
      meeting = null;
    };
    async function connect() {
      try {
        const access = await api(`/consultations/${appointment}/video-access`, {
          method: "POST",
        });
        const receivedAt = Date.now();
        const JitsiMeetExternalAPI = await loadJitsi();
        if (disposed) return;
        const remaining =
          +new Date(access.deadlineAt) -
          +new Date(access.serverNow) -
          (Date.now() - receivedAt);
        if (remaining <= 0) {
          if (!disposed) setStatus("Consultation session ended");
          return;
        }
        const participants = () => {
          if (!disposed && connected && meeting)
            setStatus(
              `Connected · ${meeting.getNumberOfParticipants()} participant(s)`,
            );
        };
        meeting = new JitsiMeetExternalAPI("meet.jit.si", {
          roomName: access.roomName,
          parentNode: host.current,
          width: "100%",
          height: 480,
          userInfo: { displayName: user.name },
          configOverwrite: {
            prejoinConfig: { enabled: true },
            startWithAudioMuted: true,
            startWithVideoMuted: true,
            disableDeepLinking: true,
            disableInviteFunctions: true,
            toolbarButtons: [
              "microphone",
              "camera",
              "hangup",
              "tileview",
              "settings",
            ],
          },
          onload: () => {
            if (!disposed) setStatus("Video workspace connected");
          },
        });
        meeting.addListener("videoConferenceJoined", () => {
          connected = true;
          participants();
        });
        meeting.addListener("participantJoined", participants);
        meeting.addListener("participantLeft", participants);
        meeting.addListener("readyToClose", () => {
          if (disposed) return;
          onClose();
        });
        deadlineTimer = setTimeout(() => {
          if (disposed) return;
          stopMeeting();
          setStatus("Consultation session ended");
          onClose();
        }, remaining);
      } catch (failure) {
        console.warn("Video connection notice:", failure?.message);
      }
    }
    connect();
    return () => {
      disposed = true;
      clearTimeout(deadlineTimer);
      stopMeeting();
    };
  }, [appointment, onClose, user.name]);

  return (
    <section className="panel video-panel">
      <div className="content-heading">
        <h3>Video consultation</h3>
        <button className="text-link" onClick={onClose}>
          Leave video
        </button>
      </div>
      <p role="status">{status}</p>
      <div ref={host} />
    </section>
  );
}
