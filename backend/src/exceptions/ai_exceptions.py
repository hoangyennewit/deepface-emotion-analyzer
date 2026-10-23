class AIException(Exception):

    def __init__(self, message:str, error_code: str):
        super().__init__(message)
        self.message = message
        self.error_code = error_code

class InvalidInputException(AIException):

    def __init__(self, message = "Dữ liệu đầu vào không hợp lệ."):
        super().__init__(message, error_code = "INVALID_INPUT_DATA")

class NoFaceDetectedException(AIException):

    def __init__(self, message = "Không tìm thấy dữ liệu khuôn mặt."):
        super().__init__(message, error_code = "NO_FACE_DETECTED")

class ModelInferenceException(AIException):

    def __init__(self, message = "Lỗi xảy ra trong quá trình suy luận mô hình."):
        super().__init__(message, error_code = "INFERENCES_FAILED")
