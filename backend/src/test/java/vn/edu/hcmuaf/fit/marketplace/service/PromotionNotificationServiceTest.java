package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.hcmuaf.fit.marketplace.dto.response.NotificationResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.Notification;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.entity.Voucher;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreFollowRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromotionNotificationServiceTest {

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private StoreFollowRepository storeFollowRepository;

    @Mock
    private UserRepository userRepository;

    private CapturingNotificationDomainService notificationDomainService;
    private PromotionNotificationService promotionNotificationService;

    @BeforeEach
    void setUp() {
        notificationDomainService = new CapturingNotificationDomainService();
        promotionNotificationService = new PromotionNotificationService(
                notificationDomainService,
                storeRepository,
                storeFollowRepository,
                userRepository
        );
    }

    @Test
    void notifyStoreFollowersForRunningVoucherSendsDistinctNotifications() {
        UUID storeId = UUID.randomUUID();
        UUID customerA = UUID.randomUUID();
        UUID customerB = UUID.randomUUID();
        Store store = Store.builder()
                .id(storeId)
                .name("Streetwear Hub")
                .slug("streetwear-hub")
                .build();
        Voucher voucher = Voucher.builder()
                .id(UUID.randomUUID())
                .storeId(storeId)
                .code("FLASH30")
                .name("Flash 30")
                .discountType(Voucher.DiscountType.PERCENT)
                .discountValue(new BigDecimal("30"))
                .minOrderValue(BigDecimal.ZERO)
                .totalIssued(100)
                .usedCount(0)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(7))
                .status(Voucher.VoucherStatus.RUNNING)
                .build();

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(store));
        when(storeFollowRepository.findFollowerUserIdsByStoreIdAndRoleAndActive(eq(storeId), eq(User.Role.CUSTOMER)))
                .thenReturn(List.of(customerA, customerB, customerA));

        promotionNotificationService.notifyStoreFollowersForRunningVoucher(voucher);

        assertEquals(2, notificationDomainService.invocations.size());
        NotificationInvocation first = notificationDomainService.invocations.get(0);
        assertEquals(Notification.NotificationType.PROMOTION, first.type());
        assertTrue(first.title().contains("FLASH30"));
        assertEquals("/store/streetwear-hub", first.link());
    }

    @Test
    void notifyMarketplaceCampaignSendsDistinctNotifications() {
        UUID customerA = UUID.randomUUID();
        UUID customerB = UUID.randomUUID();
        when(userRepository.findActiveCustomerIdsForPromotion(eq(User.Role.CUSTOMER), any(LocalDateTime.class)))
                .thenReturn(List.of(customerA, customerB, customerA));

        promotionNotificationService.notifyMarketplaceCampaign("MEGA99");

        assertEquals(2, notificationDomainService.invocations.size());
        NotificationInvocation first = notificationDomainService.invocations.get(0);
        assertEquals(Notification.NotificationType.PROMOTION, first.type());
        assertTrue(first.title().contains("MEGA99"));
        assertEquals("/profile?tab=vouchers", first.link());
    }

    private record NotificationInvocation(
            UUID userId,
            Notification.NotificationType type,
            String title,
            String message,
            String link
    ) {}

    private static final class CapturingNotificationDomainService extends NotificationDomainService {
        private final List<NotificationInvocation> invocations = new ArrayList<>();

        private CapturingNotificationDomainService() {
            super(null, null, null);
        }

        @Override
        public NotificationResponse createAndPush(
                UUID userId,
                Notification.NotificationType type,
                String title,
                String message,
                String link
        ) {
            invocations.add(new NotificationInvocation(userId, type, title, message, link));
            return null;
        }
    }
}
