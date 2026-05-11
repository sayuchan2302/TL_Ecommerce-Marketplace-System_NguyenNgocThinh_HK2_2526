package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import vn.edu.hcmuaf.fit.marketplace.util.UploadPathResolver;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ProductImageStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private static final Map<String, String> CONTENT_TYPE_TO_EXTENSION = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif"
    );

    private final Path productDirectory;
    private final long maxProductImageSizeBytes;
    private final long maxProductImagePixels;

    public ProductImageStorageService(
            @Value("${app.upload.base-dir:backend/upload}") String baseUploadDir,
            @Value("${app.upload.max-product-image-size-bytes:5242880}") long maxProductImageSizeBytes,
            @Value("${app.upload.max-product-image-pixels:20000000}") long maxProductImagePixels
    ) {
        Path basePath = UploadPathResolver.resolveBaseUploadPath(baseUploadDir);
        this.productDirectory = basePath.resolve("products").normalize();
        this.maxProductImageSizeBytes = maxProductImageSizeBytes;
        this.maxProductImagePixels = maxProductImagePixels;
        try {
            Files.createDirectories(this.productDirectory);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot initialize product image upload directory", e);
        }
    }

    public String storeProductImage(MultipartFile file) {
        byte[] payload = validateFile(file);

        String detectedFormat = detectImageFormat(payload);
        validateImagePayload(payload, detectedFormat);
        String extension = resolveExtension(file, detectedFormat);
        String filename = "product-" + UUID.randomUUID() + "." + extension;
        Path target = productDirectory.resolve(filename).normalize();
        if (!target.startsWith(productDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid upload path");
        }

        try {
            Files.write(target, payload);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot save product image");
        }

        return "/uploads/products/" + filename;
    }

    private byte[] validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product image file is required");
        }
        if (file.getSize() > maxProductImageSizeBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Product image file is too large");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product image must be an image file");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot read product image");
        }
    }

    private String resolveExtension(MultipartFile file, String detectedFormat) {
        String original = file.getOriginalFilename();
        if (original != null) {
            int dotIndex = original.lastIndexOf('.');
            if (dotIndex >= 0 && dotIndex < original.length() - 1) {
                String extension = original.substring(dotIndex + 1).toLowerCase();
                if (ALLOWED_EXTENSIONS.contains(extension)
                        && isExtensionCompatible(extension, detectedFormat)) {
                    return extension;
                }
            }
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String fromContentType = CONTENT_TYPE_TO_EXTENSION.get(contentType);
        if (fromContentType != null && isExtensionCompatible(fromContentType, detectedFormat)) {
            return fromContentType;
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported product image format");
    }

    private String detectImageFormat(byte[] payload) {
        if (payload.length >= 3
                && (payload[0] & 0xFF) == 0xFF
                && (payload[1] & 0xFF) == 0xD8
                && (payload[2] & 0xFF) == 0xFF) {
            return "jpeg";
        }
        if (payload.length >= 8
                && (payload[0] & 0xFF) == 0x89
                && payload[1] == 'P'
                && payload[2] == 'N'
                && payload[3] == 'G'
                && (payload[4] & 0xFF) == 0x0D
                && (payload[5] & 0xFF) == 0x0A
                && (payload[6] & 0xFF) == 0x1A
                && (payload[7] & 0xFF) == 0x0A) {
            return "png";
        }
        if (payload.length >= 6
                && payload[0] == 'G'
                && payload[1] == 'I'
                && payload[2] == 'F'
                && payload[3] == '8'
                && (payload[4] == '7' || payload[4] == '9')
                && payload[5] == 'a') {
            return "gif";
        }
        if (payload.length >= 12
                && payload[0] == 'R'
                && payload[1] == 'I'
                && payload[2] == 'F'
                && payload[3] == 'F'
                && payload[8] == 'W'
                && payload[9] == 'E'
                && payload[10] == 'B'
                && payload[11] == 'P') {
            return "webp";
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported product image format");
    }

    private void validateImagePayload(byte[] payload, String detectedFormat) {
        if ("webp".equals(detectedFormat)) {
            return;
        }
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(payload));
            if (image == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product image cannot be decoded");
            }
            long pixels = (long) image.getWidth() * image.getHeight();
            if (pixels > Math.max(1L, maxProductImagePixels)) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Product image dimensions are too large");
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product image cannot be decoded");
        }
    }

    private boolean isExtensionCompatible(String extension, String detectedFormat) {
        if ("jpeg".equals(detectedFormat)) {
            return "jpg".equals(extension) || "jpeg".equals(extension);
        }
        return detectedFormat.equals(extension);
    }
}
