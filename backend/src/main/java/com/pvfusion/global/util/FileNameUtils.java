package com.pvfusion.global.util;

import java.util.Locale;
import java.util.Optional;

public final class FileNameUtils {

    private FileNameUtils() {
    }

    public static Optional<String> extractExtension(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return Optional.empty();
        }

        int extensionIndex = fileName.lastIndexOf('.');
        if (extensionIndex < 0 || extensionIndex == fileName.length() - 1) {
            return Optional.empty();
        }

        return Optional.of(normalizeExtension(fileName.substring(extensionIndex + 1)));
    }

    public static String normalizeExtension(String extension) {
        if (extension == null || extension.isBlank()) {
            return "";
        }

        String normalized = extension.startsWith(".") ? extension.substring(1) : extension;
        return normalized.toLowerCase(Locale.ROOT);
    }
}
