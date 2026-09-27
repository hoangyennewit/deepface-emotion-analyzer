import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { createSession, pollSession } from "../../api/sessionApi";
import { getMockSession } from "../../api/mockApi";
import type { AnalysisSession } from "../../types/api";
import { colors, font } from "../../theme";
import FrameTimeline from "./FrameTimeline";

const USE_MOCK = true;

const statusLabel: Record<string, string> = {
  pending: "Đang chờ xử lý",
  processing: "Đang phân tích",
  completed: "Đã hoàn tất",
  failed: "Thất bại",
};

function SessionUploader() {
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopPollRef = useRef<() => void>(() => {});

  const handleFile = async (file: File) => {
    setErrorMessage("");
    setSession(null);
    setIsUploading(true);

    if (USE_MOCK) {
      setTimeout(() => {
        setSession(getMockSession());
        setIsUploading(false);
      }, 700);
      return;
    }

    try {
      const inputType = file.type.startsWith("video") ? "video" : "image";
      const { id } = await createSession(file, inputType);

      stopPollRef.current = pollSession(id, (updated) => {
        setSession(updated);
        if (updated.status === "completed" || updated.status === "failed") {
          setIsUploading(false);
        }
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: isDragOver ? `2px solid ${colors.accent}` : "2px solid transparent",
          background: colors.surface,
          borderRadius: 16,
          padding: "36px 24px",
          textAlign: "center",
          cursor: isUploading ? "default" : "pointer",
          boxShadow: "0 8px 24px rgba(30, 33, 29, 0.08)",
          transition: "border-color 0.2s",
          marginBottom: 28,
        }}
      >
        <p
          style={{
            fontFamily: font.ui,
            fontSize: 14,
            color: colors.textSecondary,
            margin: 0,
          }}
        >
          {isUploading
            ? "Đang xử lý..."
            : "Kéo thả ảnh/video vào đây, hoặc bấm để chọn file"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={handleInputChange}
        />
      </div>

      {errorMessage && (
        <p
          style={{
            fontFamily: font.ui,
            fontSize: 14,
            color: colors.danger,
            background: "#FBEAE7",
            padding: "10px 14px",
            borderRadius: 8,
          }}
        >
          {errorMessage}
        </p>
      )}

      {session && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 24,
              fontFamily: font.ui,
            }}
          >
            <span style={{ fontSize: 14, color: colors.textPrimary, fontWeight: 600 }}>
              {session.session_name}
            </span>
            <span
              style={{
                fontSize: 12,
                padding: "3px 10px",
                borderRadius: 999,
                background:
                  session.status === "completed" ? colors.accentSoft : "#F3EADA",
                color:
                  session.status === "failed" ? colors.danger : colors.textSecondary,
              }}
            >
              {statusLabel[session.status]}
            </span>
          </div>

          {session.status === "completed" && session.frames.length > 0 && (
            <FrameTimeline frames={session.frames} />
          )}
        </div>
      )}
    </div>
  );
}

export default SessionUploader;