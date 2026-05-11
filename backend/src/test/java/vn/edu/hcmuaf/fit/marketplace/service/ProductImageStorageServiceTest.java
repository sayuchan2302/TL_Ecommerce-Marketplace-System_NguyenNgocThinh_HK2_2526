package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductImageStorageServiceTest {

    @TempDir
    private Path tempDir;

    @Test
    void rejectsRenamedJpgContainingText() {
        ProductImageStorageService service = newService(20_000_000L);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "fake.jpg",
                "image/jpeg",
                "plain text".getBytes());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.storeProductImage(file));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void rejectsImageAbovePixelLimit() throws Exception {
        ProductImageStorageService service = newService(10L);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "large.png",
                "image/png",
                imageBytes("png", 4, 4));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.storeProductImage(file));

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, ex.getStatusCode());
    }

    @Test
    void acceptsDecodedJpegPngAndGif() throws Exception {
        ProductImageStorageService service = newService(20_000_000L);

        String jpgUrl = service.storeProductImage(new MockMultipartFile(
                "file",
                "valid.jpg",
                "image/jpeg",
                imageBytes("jpg", 2, 2)));
        String pngUrl = service.storeProductImage(new MockMultipartFile(
                "file",
                "valid.png",
                "image/png",
                imageBytes("png", 2, 2)));
        String gifUrl = service.storeProductImage(new MockMultipartFile(
                "file",
                "valid.gif",
                "image/gif",
                imageBytes("gif", 2, 2)));

        assertTrue(jpgUrl.endsWith(".jpg"));
        assertTrue(pngUrl.endsWith(".png"));
        assertTrue(gifUrl.endsWith(".gif"));
    }

    @Test
    void acceptsWebpSignatureWithoutReEncoding() {
        ProductImageStorageService service = newService(20_000_000L);
        byte[] webpHeader = new byte[] {
                'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' '
        };
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "valid.webp",
                "image/webp",
                webpHeader);

        String url = service.storeProductImage(file);

        assertTrue(url.endsWith(".webp"));
    }

    private ProductImageStorageService newService(long maxPixels) {
        return new ProductImageStorageService(tempDir.toString(), 5_242_880L, maxPixels);
    }

    private byte[] imageBytes(String format, int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, Color.RED.getRGB());
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, format, output);
        return output.toByteArray();
    }
}
