# Chuẩn hóa kết quả trả về từ API
from typing import Optional, List, Dict, Any

def create_ai_respose(
    success: bool,
    faces: Optional[List[Dict[str, Any]]] = None,
    message: Optional[str] = None,
    error_code: Optional[str] = None
) -> Dict[str, Any]:
    face_list = faces or []
    dominant_summary: Dict[str, int] = {}

    for face in face_list:
        dominant_emotion = face.get("dominant_emotion", "unknown")
        dominant_summary[dominant_emotion] = dominant_summary.get(dominant_emotion, 0) + 1

    return {
        "success": success,
        "total_faces": len(face_list),
        "emotion_summary": dominant_summary,
        "faces": face_list,
        "error_code": {
            "code": error_code,
            "message": message
        } if not success else None
    }

