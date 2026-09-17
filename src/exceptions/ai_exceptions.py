class AIException(Exception):

    def __init__(selt, message:str, error_code: str):
        super.__init__(message)
        selt.message = message
        selt.error_code = error_code

class InvalidInputException(AIException):

    def __init__(selt, message = "Dữ liệu đầu vào không hợp lệ."):
        super().__init__(message, error_code = "Invalid_Input_Data")

class NoFaceDetectedException(AIException):

    def __init__(selt, message = "Không tìm thấy dữ liệu khuôn mặt."):
        super().__init__(message, error_code = "No_Face_Detected")

class ModelInferenceException(AIException):

    def __init__(selt, message = "Lỗi xảy ra trong quá trình suy luận mô hình."):
        super().__init__(message, error_code = "Inference_Failed")
