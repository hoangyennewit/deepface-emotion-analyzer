-- 1.2. Database Schema — DeepFace Emotion Analyzer
-- Database: PostgreSQL (có thể dùng SQLite/MySQL tương tự)

-- Bảng 1: Phiên phân tích (lưu metadata của ảnh/video/webcam)
CREATE TABLE analysis_sessions (
    id              SERIAL PRIMARY KEY,
    session_name    VARCHAR(255) NOT NULL,              -- tên phiên do ngườii dùng đặt
    input_type      VARCHAR(20)  NOT NULL                 -- 'image' | 'video' | 'webcam'
                  CHECK (input_type IN ('image', 'video', 'webcam')),
    file_path       VARCHAR(500),                          -- đường dẫn file gốc đã upload (NULL với webcam)
    file_size_bytes BIGINT,
    duration_seconds FLOAT,                                -- thờii lượng video/webcam (NULL với ảnh)
    fps             FLOAT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' -- 'pending' | 'processing' | 'completed' | 'failed'
                  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMP
);

-- Bảng 2: Khung hình / mốc thờii gian phân tích
CREATE TABLE frame_analyses (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    frame_index     INTEGER NOT NULL,                      -- số thứ tự frame
    timestamp_sec   FLOAT NOT NULL,                        -- mốc thờii gian trong video/webcam (giây)
    frame_path      VARCHAR(500),                          -- đường dẫn ảnh frame đã lưu
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, frame_index)
);

-- Bảng 3: Khuôn mặt phát hiện được trong mỗi frame (tọa độ mặt)
CREATE TABLE detected_faces (
    id              SERIAL PRIMARY KEY,
    frame_id        INTEGER NOT NULL REFERENCES frame_analyses(id) ON DELETE CASCADE,
    bbox_x          INTEGER NOT NULL,                      -- tọa độ bounding box
    bbox_y          INTEGER NOT NULL,
    bbox_width      INTEGER NOT NULL,
    bbox_height     INTEGER NOT NULL,
    face_confidence FLOAT,                                 -- độ tin cậy phát hiện khuôn mặt
    face_image_path VARCHAR(500),                          -- ảnh khuôn mặt đã cắt
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bảng 4: Điểm số từng cảm xúc của từng khuôn mặt
CREATE TABLE emotion_scores (
    id             SERIAL PRIMARY KEY,
    face_id        INTEGER NOT NULL REFERENCES detected_faces(id) ON DELETE CASCADE,
    emotion        VARCHAR(20) NOT NULL
                 CHECK (emotion IN ('angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral')),
    score          FLOAT NOT NULL,                         -- điểm (0–1 hoặc %), mỗi khuôn mặt có 7 dòng
    is_dominant    BOOLEAN NOT NULL DEFAULT FALSE,         -- cảm xúc cao nhất của khuôn mặt
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bảng 5: Báo cáo đã xuất (đầu ra file)
CREATE TABLE reports (
    id             SERIAL PRIMARY KEY,
    session_id     INTEGER NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    report_type    VARCHAR(10) NOT NULL CHECK (report_type IN ('pdf', 'excel')),
    file_path      VARCHAR(500) NOT NULL,
    generated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index để tra cứu nhanh
CREATE INDEX idx_frame_session    ON frame_analyses(session_id);
CREATE INDEX idx_face_frame       ON detected_faces(frame_id);
CREATE INDEX idx_emotion_face     ON emotion_scores(face_id);
CREATE INDEX idx_emotion_type     ON emotion_scores(emotion);

/* ============================================================
   Giải thích mối quan hệ (ER):
   analysis_sessions (1) ──< (N) frame_analyses
   frame_analyses  (1) ──< (N) detected_faces
   detected_faces  (1) ──< (N) emotion_scores   (7 dòng/khuôn mặt)
   analysis_sessions (1) ──< (N) reports
   ============================================================ */
