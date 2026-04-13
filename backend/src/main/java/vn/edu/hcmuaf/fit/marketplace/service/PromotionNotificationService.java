package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.marketplace.entity.Notification;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.entity.Voucher;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreFollowRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class PromotionNotificationService {

    private static final String VOUCHER_WALLET_LINK = "/profile?tab=vouchers";
    private static final int ACTIVE_CUSTOMER_DAYS = 90;

    private final NotificationDomainService notificationDomainService;
    private final StoreRepository storeRepository;
    private final StoreFollowRepository storeFollowRepository;
    private final UserRepository userRepository;

    public PromotionNotificationService(
            NotificationDomainService notificationDomainService,
            StoreRepository storeRepository,
            StoreFollowRepository storeFollowRepository,
            UserRepository userRepository
    ) {
        this.notificationDomainService = notificationDomainService;
        this.storeRepository = storeRepository;
        this.storeFollowRepository = storeFollowRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void notifyStoreFollowersForRunningVoucher(Voucher voucher) {
        if (voucher == null || voucher.getStoreId() == null) {
            return;
        }

        Store store = storeRepository.findById(voucher.getStoreId()).orElse(null);
        String storeName = normalize(store == null ? null : store.getName(), "Shop");
        String storeSlug = normalize(store == null ? null : store.getSlug(), "");
        String voucherCode = normalize(voucher.getCode(), "VOUCHER");
        String link = storeSlug.isBlank() ? VOUCHER_WALLET_LINK : "/store/" + storeSlug;

        List<UUID> followerIds = storeFollowRepository.findFollowerUserIdsByStoreIdAndRoleAndActive(
                voucher.getStoreId(),
                User.Role.CUSTOMER
        );
        if (followerIds == null || followerIds.isEmpty()) {
            return;
        }

        Set<UUID> uniqueUserIds = new LinkedHashSet<>(followerIds);
        String title = "Shop " + storeName + " vua co voucher moi: " + voucherCode;
        String message = "Nhan vao de xem va su dung uu dai moi.";
        for (UUID userId : uniqueUserIds) {
            notificationDomainService.createAndPush(
                    userId,
                    Notification.NotificationType.PROMOTION,
                    title,
                    message,
                    link
            );
        }
    }

    @Transactional
    public void notifyMarketplaceCampaign(String voucherCode) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(ACTIVE_CUSTOMER_DAYS);
        List<UUID> recipients = userRepository.findActiveCustomerIdsForPromotion(User.Role.CUSTOMER, cutoff);
        if (recipients == null || recipients.isEmpty()) {
            return;
        }

        Set<UUID> uniqueUserIds = new LinkedHashSet<>(recipients);
        String safeCode = normalize(voucherCode, "VOUCHER");
        String title = "San vua co voucher moi: " + safeCode;
        String message = "Uu dai moi da cap nhat trong vi voucher cua ban.";
        for (UUID userId : uniqueUserIds) {
            notificationDomainService.createAndPush(
                    userId,
                    Notification.NotificationType.PROMOTION,
                    title,
                    message,
                    VOUCHER_WALLET_LINK
            );
        }
    }

    private String normalize(String raw, String fallback) {
        if (raw == null) {
            return fallback;
        }
        String normalized = raw.trim();
        return normalized.isEmpty() ? fallback : normalized;
    }
}
