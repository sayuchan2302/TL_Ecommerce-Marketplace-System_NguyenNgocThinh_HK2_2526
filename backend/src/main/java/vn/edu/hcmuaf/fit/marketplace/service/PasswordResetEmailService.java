package vn.edu.hcmuaf.fit.marketplace.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;
import vn.edu.hcmuaf.fit.marketplace.config.PasswordResetProperties;
import vn.edu.hcmuaf.fit.marketplace.entity.User;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class PasswordResetEmailService {

    private static final String BRAND_NAME = "Phô Mặc";
    private static final String LOGO_CID = "phoMacLogo";
    private static final Resource LOGO_RESOURCE = new ClassPathResource("mail/pho-mac-logo.png");
    private static final DateTimeFormatter EXPIRES_AT_FORMATTER = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final JavaMailSender mailSender;
    private final PasswordResetProperties properties;

    public PasswordResetEmailService(JavaMailSender mailSender, PasswordResetProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    public void sendPasswordResetEmail(User user, String resetLink, LocalDateTime expiresAt) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );
            if (StringUtils.hasText(properties.getMailFrom())) {
                helper.setFrom(properties.getMailFrom().trim());
            }
            helper.setTo(user.getEmail());
            helper.setSubject("Đặt lại mật khẩu " + BRAND_NAME);
            helper.setText(buildPlainTextBody(user, resetLink, expiresAt), buildHtmlBody(user, resetLink, expiresAt));
            if (LOGO_RESOURCE.exists()) {
                helper.addInline(LOGO_CID, LOGO_RESOURCE, "image/png");
            }
            mailSender.send(message);
        } catch (MessagingException ex) {
            throw new MailPreparationException("Could not prepare password reset email", ex);
        }
    }

    String buildPlainTextBody(User user, String resetLink, LocalDateTime expiresAt) {
        String name = resolveName(user);
        return """
                Xin chào %s,

                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản %s của bạn.

                Vui lòng mở liên kết dưới đây để đặt mật khẩu mới:
                %s

                Liên kết này hết hạn lúc %s và chỉ sử dụng được một lần.
                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

                %s
                """.formatted(name, BRAND_NAME, resetLink, expiresAt.format(EXPIRES_AT_FORMATTER), BRAND_NAME);
    }

    String buildHtmlBody(User user, String resetLink, LocalDateTime expiresAt) {
        String name = escapeHtml(resolveName(user));
        String escapedResetLink = escapeHtml(resetLink);
        String expiresAtText = escapeHtml(expiresAt.format(EXPIRES_AT_FORMATTER));
        String brandName = escapeHtml(BRAND_NAME);
        String template = """
                <!doctype html>
                <html lang="vi">
                <body style="margin:0;padding:0;background:#f5f3ef;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#1f1f1f;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f3ef;padding:32px 12px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e7dfd4;border-radius:8px;overflow:hidden;">
                          <tr>
                            <td style="padding:28px 32px 20px;border-bottom:1px solid #eee7de;">
                              <img src="cid:${LOGO_CID}" width="180" alt="${BRAND_NAME}" style="display:block;width:180px;max-width:100%;height:auto;border:0;margin:0 0 20px;">
                              <div style="font-size:12px;line-height:18px;letter-spacing:1.2px;text-transform:uppercase;color:#716a62;font-weight:700;">Bảo mật tài khoản</div>
                              <h1 style="margin:8px 0 0;font-size:26px;line-height:34px;color:#151515;font-weight:700;">Đặt lại mật khẩu</h1>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:28px 32px 8px;">
                              <p style="margin:0 0 16px;font-size:16px;line-height:25px;color:#2f2f2f;">Xin chào ${USER_NAME},</p>
                              <p style="margin:0 0 18px;font-size:16px;line-height:25px;color:#2f2f2f;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản ${BRAND_NAME} của bạn.</p>
                              <p style="margin:0 0 22px;font-size:16px;line-height:25px;color:#2f2f2f;">Nhấn nút bên dưới để tạo mật khẩu mới. Liên kết chỉ dùng được một lần.</p>
                              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                                <tr>
                                  <td style="border-radius:6px;background:#214fdb;">
                                    <a href="${RESET_LINK}" style="display:inline-block;padding:13px 22px;color:#ffffff;text-decoration:none;font-size:15px;line-height:20px;font-weight:700;border-radius:6px;">Đặt mật khẩu mới</a>
                                  </td>
                                </tr>
                              </table>
                              <div style="margin:0 0 18px;padding:14px 16px;background:#f8f6f2;border-left:3px solid #214fdb;border-radius:6px;">
                                <p style="margin:0;font-size:14px;line-height:22px;color:#4b463f;">Liên kết này hết hạn lúc <strong style="color:#1f1f1f;">${EXPIRES_AT}</strong>.</p>
                              </div>
                              <p style="margin:0;font-size:14px;line-height:22px;color:#5c564f;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:22px 32px 28px;">
                              <div style="height:1px;background:#eee7de;margin:0 0 18px;"></div>
                              <p style="margin:0;font-size:12px;line-height:18px;color:#8a837b;">Email này được gửi tự động từ ${BRAND_NAME}. Vui lòng không chia sẻ liên kết đặt lại mật khẩu cho bất kỳ ai.</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """;
        return template
                .replace("${LOGO_CID}", LOGO_CID)
                .replace("${BRAND_NAME}", brandName)
                .replace("${USER_NAME}", name)
                .replace("${RESET_LINK}", escapedResetLink)
                .replace("${EXPIRES_AT}", expiresAtText);
    }

    private String resolveName(User user) {
        return StringUtils.hasText(user.getName()) ? user.getName().trim() : "bạn";
    }

    private String escapeHtml(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }
}
