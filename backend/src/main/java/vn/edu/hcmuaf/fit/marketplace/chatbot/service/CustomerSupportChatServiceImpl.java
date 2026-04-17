package vn.edu.hcmuaf.fit.marketplace.chatbot.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.marketplace.entity.Order;
import vn.edu.hcmuaf.fit.marketplace.exception.ResourceNotFoundException;
import vn.edu.hcmuaf.fit.marketplace.service.OrderService;

import java.util.Locale;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class CustomerSupportChatServiceImpl implements CustomerSupportChatService {

    private final OrderService orderService;
    private final FaqContentLookupService faqContentLookupService;

    public CustomerSupportChatServiceImpl(OrderService orderService, FaqContentLookupService faqContentLookupService) {
        this.orderService = orderService;
        this.faqContentLookupService = faqContentLookupService;
    }

    @Override
    public OrderLookupResult lookupOrderStatus(String orderCode, String phoneLast4) {
        String normalizedCode = orderCode == null ? "" : orderCode.trim().toUpperCase(Locale.ROOT);
        String normalizedPhone4 = normalizeLast4(phoneLast4);

        if (normalizedCode.isBlank()) {
            return new OrderLookupResult(false, "Ban hay nhap ma don hang.");
        }
        if (normalizedPhone4.length() != 4) {
            return new OrderLookupResult(false, "4 so cuoi so dien thoai chua hop le.");
        }

        try {
            Order order = orderService.findByCode(normalizedCode);
            String shippingPhone = order.getShippingAddress() == null ? null : order.getShippingAddress().getPhone();
            String shippingDigits = digitsOnly(shippingPhone);

            if (shippingDigits.length() < 4 || !shippingDigits.endsWith(normalizedPhone4)) {
                return new OrderLookupResult(
                        false,
                        "Khong xac minh duoc don hang. Vui long kiem tra lai ma don hoac 4 so cuoi SDT."
                );
            }

            String statusLabel = switch (order.getStatus()) {
                case PENDING -> "Don moi tao";
                case WAITING_FOR_VENDOR -> "Dang cho shop xac nhan";
                case CONFIRMED -> "Shop da xac nhan don";
                case PROCESSING -> "Don dang duoc chuan bi";
                case SHIPPED -> "Don dang giao";
                case DELIVERED -> "Don da giao thanh cong";
                case CANCELLED -> "Don da huy";
            };

            String paymentLabel = order.getPaymentStatus() == null
                    ? "Khong xac dinh"
                    : order.getPaymentStatus().name();

            return new OrderLookupResult(
                    true,
                    "Don " + order.getOrderCode() + " hien o trang thai: " + statusLabel + ". Thanh toan: " + paymentLabel + "."
            );
        } catch (ResourceNotFoundException ex) {
            return new OrderLookupResult(false, "Khong tim thay don hang. Ban kiem tra lai ma don giup minh nhe.");
        }
    }

    @Override
    public SizeAdviceResult recommendSize(int heightCm, int weightKg) {
        String suggestedSize;
        if (heightCm < 160 || weightKg < 52) {
            suggestedSize = "S";
        } else if (heightCm < 168 || weightKg < 60) {
            suggestedSize = "M";
        } else if (heightCm < 176 || weightKg < 70) {
            suggestedSize = "L";
        } else if (heightCm < 184 || weightKg < 80) {
            suggestedSize = "XL";
        } else {
            suggestedSize = "XXL";
        }

        return new SizeAdviceResult(
                suggestedSize,
                "Voi chieu cao " + heightCm + "cm va can nang " + weightKg + "kg, size goi y la "
                        + suggestedSize + ". Ban nen uu tien bang size theo tung san pham de chinh xac hon."
        );
    }

    @Override
    public String answerProductFaq(String rawQuestion) {
        Optional<String> configuredAnswer = faqContentLookupService.findAnswerByKeyword(rawQuestion);
        if (configuredAnswer.isPresent()) {
            return configuredAnswer.get();
        }

        String question = rawQuestion == null ? "" : rawQuestion.toLowerCase(Locale.ROOT);
        if (question.contains("doi tra") || question.contains("doi hang") || question.contains("tra hang")) {
            return "Ban co the gui yeu cau doi/tra trong trang Don hang cua toi theo dung chinh sach hien hanh.";
        }
        if (question.contains("giao hang") || question.contains("ship")) {
            return "Thoi gian giao hang tuy khu vuc, thuong tu 1-5 ngay lam viec.";
        }
        if (question.contains("chat lieu")) {
            return "Ban xem phan mo ta san pham de biet chat lieu va huong dan bao quan chi tiet.";
        }
        return "Ban co the hoi ve doi tra, giao hang, chat lieu hoac chon lai menu de tra cuu nhanh.";
    }

    private String normalizeLast4(String value) {
        String digits = digitsOnly(value);
        return digits.length() <= 4 ? digits : digits.substring(digits.length() - 4);
    }

    private String digitsOnly(String value) {
        return value == null ? "" : value.replaceAll("\\D+", "");
    }
}

