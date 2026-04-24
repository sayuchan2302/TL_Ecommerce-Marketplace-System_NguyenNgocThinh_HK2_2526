package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.util.UploadPathResolver;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class AvatarStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private static final Map<String, String> CONTENT_TYPE_TO_EXTENSION = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif"
    );

    private final Path avatarDirectory;
    private final long maxAvatarSizeBytes;

    public AvatarStorageService(
            @Value("${app.upload.base-dir:backend/upload}") String baseUploadDir,
            @Value("${app.upload.max-avatar-size-bytes:3145728}") long maxAvatarSizeBytes
    ) {
        Path basePath = UploadPathResolver.resolveBaseUploadPath(baseUploadDir);
        this.avatarDirectory = basePath.resolve("avatars").normalize();
        this.maxAvatarSizeBytes = maxAvatarSizeBytes;
        try {
            Files.createDirectories(this.avatarDirectory);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot initialize avatar upload directory", e);
        }
    }

    public String storeAvatar(MultipartFile file, String previousAvatar) {
        validateFile(file);

        String extension = resolveExtension(file);
        String filename = "avatar-" + UUID.randomUUID() + "." + extension;
        Path target = avatarDirectory.resolve(filename).normalize();

        if (!target.startsWith(avatarDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid upload path");
        }

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot save avatar file");
        }

        deletePreviousAvatar(previousAvatar);
        return "/uploads/avatars/" + filename;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Avatar file is required");
        }
        if (file.getSize() > maxAvatarSizeBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Avatar file is too large");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Avatar must be an image file");
        }
    }

    private String resolveExtension(MultipartFile file) {
        String original = file.getOriginalFilename();
        if (original != null) {
            int dotIndex = original.lastIndexOf('.');
            if (dotIndex >= 0 && dotIndex < original.length() - 1) {
                String extension = original.substring(dotIndex + 1).toLowerCase();
                if (ALLOWED_EXTENSIONS.contains(extension)) {
                    return extension;
                }
            }
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String fromContentType = CONTENT_TYPE_TO_EXTENSION.get(contentType);
        if (fromContentType != null) {
            return fromContentType;
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported avatar format");
    }

    private void deletePreviousAvatar(String previousAvatar) {
        String previousFilename = extractAvatarFilename(previousAvatar);
        if (previousFilename == null || previousFilename.isBlank()) {
            return;
        }

        Path previousPath = avatarDirectory.resolve(previousFilename).normalize();
        if (!previousPath.startsWith(avatarDirectory)) {
            return;
        }

        try {
            Files.deleteIfExists(previousPath);
        } catch (IOException ignored) {
            // Ignore cleanup errors to avoid breaking avatar upload success path.
        }
    }

    private String extractAvatarFilename(String previousAvatar) {
        if (previousAvatar == null || previousAvatar.isBlank()) {
            return null;
        }

        String marker = "/uploads/avatars/";
        String value = previousAvatar.trim();
        int markerIndex = value.indexOf(marker);
        if (markerIndex < 0) {
            return null;
        }

        String tail = value.substring(markerIndex + marker.length());
        if (tail.isBlank()) {
            return null;
        }

        Path filename = Paths.get(tail).getFileName();
        return filename == null ? null : filename.toString();
    }
}
