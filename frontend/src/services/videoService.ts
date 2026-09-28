const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5173';

export interface UploadedVideoInfo  {
    file_id: string;
    file_name: string;
    stored_name: string;
    size: number;
}

export interface UploadVideoResponse {
    success: boolean;
    message: string;
    saved: boolean;
    file?: UploadedVideoInfo;
    temporary_path?: string;
}

export async function uploadVideo(file: File, save_file: boolean = false): Promise<UploadVideoResponse> {
    const formData = new FormData();
    formData.append("video", file);
    formData.append("save_file", String(save_file));

    const response = await fetch(`${API_BASE_URL}/upload/video`, {
        method: "POST",
        body: formData,
    });
    if(!response.ok) {
        let message = "Có lỗi xảy ra khi tải video lên.";
        try {
            const errorData = await response.json();
            if(errorData?.detail) {
                message = errorData.detail;
            }
        } catch (e) {
            console.error("Error parsing JSON response:", e);
        }
        throw new Error(message);
    }

    const data: UploadVideoResponse = await response.json();
    return data;
}
