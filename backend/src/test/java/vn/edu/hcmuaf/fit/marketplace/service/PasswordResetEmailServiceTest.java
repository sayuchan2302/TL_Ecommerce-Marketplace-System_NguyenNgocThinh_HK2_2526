package vn.edu.hcmuaf.fit.marketplace.service;

import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import vn.edu.hcmuaf.fit.marketplace.config.PasswordResetProperties;
import vn.edu.hcmuaf.fit.marketplace.entity.User;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetEmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    private PasswordResetEmailService service;

    @BeforeEach
    void setUp() {
        PasswordResetProperties properties = new PasswordResetProperties();
        properties.setMailFrom("no-reply@phomac.local");
        service = new PasswordResetEmailService(mailSender, properties);
    }

    @Test
    void sendPasswordResetEmailUsesVietnameseSubjectAndHtmlMime() throws Exception {
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        User user = buildUser("Ngọc Thịnh");
        when(mailSender.createMimeMessage()).thenReturn(message);

        service.sendPasswordResetEmail(
                user,
                "http://localhost:5173/reset-password?token=abc123",
                LocalDateTime.of(2026, 5, 16, 22, 50)
        );

        verify(mailSender).send(message);
        assertEquals("Đặt lại mật khẩu Phô Mặc", message.getSubject());
        assertEquals("no-reply@phomac.local", ((InternetAddress) message.getFrom()[0]).getAddress());
        assertEquals("customer@test.local", ((InternetAddress) message.getAllRecipients()[0]).getAddress());
        message.saveChanges();
        assertTrue(message.getContentType().toLowerCase(Locale.ROOT).contains("multipart"));
    }

    @Test
    void buildBodiesUseVietnameseTextAndEscapeHtml() {
        User user = buildUser("Ngọc <Thịnh>");
        LocalDateTime expiresAt = LocalDateTime.of(2026, 5, 16, 22, 50);
        String resetLink = "http://localhost:5173/reset-password?token=abc123";

        String plainText = service.buildPlainTextBody(user, resetLink, expiresAt);
        String html = service.buildHtmlBody(user, resetLink, expiresAt);

        assertTrue(plainText.contains("Xin chào Ngọc <Thịnh>"));
        assertTrue(plainText.contains("Chúng tôi nhận được yêu cầu đặt lại mật khẩu"));
        assertTrue(plainText.contains("Liên kết này hết hạn lúc 22:50 16/05/2026"));
        assertTrue(html.contains("Xin chào Ngọc &lt;Thịnh&gt;"));
        assertTrue(html.contains("Bảo mật tài khoản"));
        assertTrue(html.contains("Đặt mật khẩu mới"));
        assertTrue(html.contains("cid:phoMacLogo"));
        assertTrue(html.contains("href=\"http://localhost:5173/reset-password?token=abc123\""));
        assertFalse(html.contains(">http://localhost:5173/reset-password?token=abc123</a>"));
        assertFalse(html.contains("Nếu nút không hoạt động"));
        assertFalse(html.contains("Xin chào Ngọc <Thịnh>"));
    }

    private User buildUser(String name) {
        return User.builder()
                .email("customer@test.local")
                .name(name)
                .build();
    }
}
