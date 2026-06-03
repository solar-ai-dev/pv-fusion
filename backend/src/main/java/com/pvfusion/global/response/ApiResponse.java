package com.pvfusion.global.response;

public record ApiResponse<T>(
        boolean success,
        T data,
        String message
) {

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, data, message);
    }

    public static <T> ApiResponse<T> success(T data) {
        return success(data, "요청이 성공했습니다.");
    }

    public static ApiResponse<Void> successMessage(String message) {
        return new ApiResponse<>(true, null, message);
    }

    public static ApiResponse<Void> emptySuccess() {
        return successMessage("요청이 성공했습니다.");
    }
}
