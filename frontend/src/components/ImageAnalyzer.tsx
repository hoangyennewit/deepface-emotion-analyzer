import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { analyzeImage } from "../api/emotionApi";
import type { AnalysisResponse } from "../types/emotion";
import { colors, font } from "../theme";
import EmotionResult from "./EmotionResult";

type Status = "idle" | "loading" | "success" | "error";

function ImageAnalyzer() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Vui lòng chọn file ảnh (jpg, png, webp)");
      setStatus("error");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setErrorMessage("");
    setStatus("loading");

    try {
      const data = await analyzeImage(file);
      if (!data.success) {
        setErrorMessage(data.error?.message ?? "Phân tích thất bại");
        setStatus("error");
        return;
      }
      setResult(data);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setStatus("error");
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
    <div style={{ minHeight: "100vh", background: colors.bg }}>
      <div style={{ background: colors.accent, padding: "56px 24px 64px", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: font.display,
            fontSize: 36,
            fontWeight: 600,
            color: "#FFFFFF",
            margin: 0,
          }}
        >
          Phân tích cảm xúc khuôn mặt
        </h1>
        <p
          style={{
            fontFamily: font.ui,
            fontSize: 15,
            color: "rgba(255,255,255,0.78)",
            marginTop: 10,
            maxWidth: 440,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Tải lên một ảnh để xem kết quả phân tích cảm xúc khuôn mặt.
        </p>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 56px" }}>
        <div
          onClick={() => status !== "loading" && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          style={{
            marginTop: -32,
            border: isDragOver ? `2px solid ${colors.accent}` : "2px solid transparent",
            background: colors.surface,
            borderRadius: 16,
            padding: previewUrl ? 16 : "40px 24px",
            textAlign: "center",
            cursor: status === "loading" ? "default" : "pointer",
            boxShadow: "0 8px 24px rgba(30, 33, 29, 0.08)",
            transition: "border-color 0.2s",
            marginBottom: 24,
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="preview"
              style={{
                width: "100%",
                maxHeight: 320,
                objectFit: "contain",
                borderRadius: 10,
              }}
            />
          ) : (
            <p style={{ fontFamily: font.ui, fontSize: 14, color: colors.textSecondary, margin: 0 }}>
              Kéo thả ảnh vào đây, hoặc bấm để chọn file
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleInputChange}
          />
        </div>

        {status === "loading" && (
          <p style={{ fontFamily: font.ui, fontSize: 14, color: colors.textSecondary, textAlign: "center" }}>
            Đang phân tích...
          </p>
        )}

        {status === "error" && (
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

        {status === "success" && result && (
          <div>
            <p style={{ fontFamily: font.ui, fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
              Phát hiện {result.total_faces} khuôn mặt
            </p>
            {result.face_emotions.map((face, i) => (
              <EmotionResult key={i} face={face} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageAnalyzer;