import { useCallback, useEffect, useRef, useState } from "react";
// import { saveWebcamSession, type WebcamSample } from "../services/historyApi";
import { saveWebcamSession, type WebcamFrameFace, type WebcamSample } from "../services/historyApi";

// VP8 đứng đầu: mã hóa bằng phần mềm nhẹ hơn VP9 nhiều, ít tranh CPU với model nhận diện.
const PREFERRED_TYPES = ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm", "video/mp4"];
const VALID_EMOTIONS = new Set(["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]);

// Giới hạn bitrate để trình duyệt không mã hóa quá nặng khi đang nhận diện realtime.
const VIDEO_BITS_PER_SECOND = 1_000_000; // ~1 Mbps, đủ rõ để xem lại lịch sử

/** Đổi kết quả phân tích của trang webcam sang dạng timeline server chấp nhận */
export const toSampleFaces = (faces: WebcamFrameFace[]): WebcamSample["faces"] => {
  const result: WebcamSample["faces"] = [];
  faces.forEach((face, index) => {
    const emotion = Object.fromEntries(
      Object.entries(face.emotion ?? {}).filter(
        ([key, value]) => VALID_EMOTIONS.has(key) && Number.isFinite(value)
      )
    );
    const dominant = Object.entries(emotion).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!dominant) return;

    result.push({
      track_id: face.track_id ?? index,
      dominant_emotion: dominant,
      confidence: Math.min(100, Math.max(0, emotion[dominant])),
      emotion,
      bbox: face.bbox && face.bbox.length === 4 ? [...face.bbox] : null,
    });
  });
  return result;
};

export function useWebcamRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const samplesRef = useRef<WebcamSample[]>([]);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);

  /** Gọi ngay sau khi bắt đầu nhận diện */
  const start = useCallback((stream: MediaStream) => {
    if (typeof MediaRecorder === "undefined") {
      throw new Error("Trình duyệt không hỗ trợ ghi video.");
    }
    const mimeType = PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
    });

    chunksRef.current = [];
    samplesRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(1000);

    recorderRef.current = recorder;
    startedAtRef.current = performance.now();
    setRecording(true);
  }, []);

  /** capturedAtMs = performance.now() lúc chụp frame (không phải lúc nhận kết quả) */
  const addSample = useCallback((faces: WebcamSample["faces"], capturedAtMs?: number) => {
    if (!recorderRef.current) return;
    const at = capturedAtMs ?? performance.now();
    const time = Math.max(0, Math.round(at - startedAtRef.current)) / 1000;
    samplesRef.current.push({ time, faces });
  }, []);

  /** Gọi TRƯỚC khi dừng các track của stream. Trả về null nếu phiên quá ngắn. */
  const stopAndSave = useCallback(async (name?: string) => {
    const recorder = recorderRef.current;
    if (!recorder) return null;
    recorderRef.current = null;
    setRecording(false);

    const mime = recorder.mimeType || "video/webm";
    const blob = await new Promise<Blob>((resolve) => {
      if (recorder.state === "inactive") {
        resolve(new Blob(chunksRef.current, { type: mime }));
        return;
      }
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: mime }));
      recorder.stop();
    });

    const duration = (performance.now() - startedAtRef.current) / 1000;
    if (duration < 1 || blob.size === 0) return null;

    setSaving(true);
    try {
      return await saveWebcamSession(blob, {
        name,
        duration: Math.round(duration * 100) / 100,
        samples: [...samplesRef.current].sort((a, b) => a.time - b.time),
      });
    } finally {
      setSaving(false);
    }
  }, []);

  // Rời trang giữa chừng thì dừng ghi, không lưu
  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    },
    []
  );

  return { recording, saving, start, addSample, stopAndSave };
}