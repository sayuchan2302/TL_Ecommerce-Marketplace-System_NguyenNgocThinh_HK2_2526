package vn.edu.hcmuaf.fit.fashionstore.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.fashionstore.dto.request.StoreRequest;
import vn.edu.hcmuaf.fit.fashionstore.dto.response.StoreResponse;
import vn.edu.hcmuaf.fit.fashionstore.entity.Store;
import vn.edu.hcmuaf.fit.fashionstore.entity.User;
import vn.edu.hcmuaf.fit.fashionstore.repository.StoreRepository;
import vn.edu.hcmuaf.fit.fashionstore.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class StoreService {

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    public StoreService(StoreRepository storeRepository, UserRepository userRepository) {
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
    }

    private static final Pattern SLUG_PATTERN = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");

    @Transactional
    public StoreResponse registerStore(UUID userId, StoreRequest request) {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (storeRepository.findByOwnerId(userId).isPresent()) {
            throw new RuntimeException("User already has a store");
        }

        if (storeRepository.existsByName(request.getName())) {
            throw new RuntimeException("Store name already exists");
        }

        String slug = generateSlug(request.getSlug() != null ? request.getSlug() : request.getName());
        if (storeRepository.existsBySlug(slug)) {
            throw new RuntimeException("Store URL already exists");
        }

        Store store = Store.builder()
                .owner(owner)
                .name(request.getName())
                .slug(slug)
                .description(request.getDescription())
                .logo(request.getLogo())
                .banner(request.getBanner())
                .contactEmail(request.getContactEmail() != null ? request.getContactEmail() : owner.getEmail())
                .phone(request.getPhone())
                .address(request.getAddress())
                .commissionRate(5.0)
                .status(Store.StoreStatus.INACTIVE)
                .approvalStatus(Store.ApprovalStatus.PENDING)
                .totalSales(0.0)
                .totalOrders(0)
                .rating(0.0)
                .build();

        Store saved = storeRepository.save(store);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public StoreResponse getStoreByOwner(UUID userId) {
        Store store = storeRepository.findByOwnerId(userId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
        return toResponse(store);
    }

    @Transactional(readOnly = true)
    public StoreResponse getStoreById(UUID storeId) {
        Store store = storeRepository.findByIdAndApprovalStatusAndStatus(
                        storeId,
                        Store.ApprovalStatus.APPROVED,
                        Store.StoreStatus.ACTIVE
                )
                .orElseThrow(() -> new RuntimeException("Store not found"));
        return toResponse(store);
    }

    @Transactional(readOnly = true)
    public StoreResponse getStoreBySlug(String slug) {
        Store store = storeRepository.findBySlugAndApprovalStatusAndStatus(
                        slug,
                        Store.ApprovalStatus.APPROVED,
                        Store.StoreStatus.ACTIVE
                )
                .orElseThrow(() -> new RuntimeException("Store not found"));
        return toResponse(store);
    }

    @Transactional(readOnly = true)
    public List<StoreResponse> getPendingStores() {
        return storeRepository.findByApprovalStatus(Store.ApprovalStatus.PENDING)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StoreResponse> getAllStoresForAdmin() {
        return storeRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StoreResponse> getAllActiveStores() {
        return storeRepository.findByApprovalStatusAndStatus(
                Store.ApprovalStatus.APPROVED,
                Store.StoreStatus.ACTIVE
        ).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public StoreResponse approveStore(UUID storeId, String approvedBy) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (store.getApprovalStatus() != Store.ApprovalStatus.PENDING) {
            throw new RuntimeException("Store is not pending approval");
        }

        store.setApprovalStatus(Store.ApprovalStatus.APPROVED);
        store.setStatus(Store.StoreStatus.ACTIVE);
        store.setApprovedAt(LocalDateTime.now());
        store.setApprovedBy(approvedBy);

        Store saved = storeRepository.save(store);
        User owner = store.getOwner();
        owner.setRole(User.Role.VENDOR);
        owner.setStoreId(saved.getId());
        userRepository.save(owner);
        return toResponse(saved);
    }

    @Transactional
    public StoreResponse rejectStore(UUID storeId, String reason) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (store.getApprovalStatus() != Store.ApprovalStatus.PENDING) {
            throw new RuntimeException("Store is not pending approval");
        }

        store.setApprovalStatus(Store.ApprovalStatus.REJECTED);
        store.setRejectionReason(reason);

        Store saved = storeRepository.save(store);
        User owner = store.getOwner();
        owner.setRole(User.Role.CUSTOMER);
        owner.setStoreId(null);
        userRepository.save(owner);
        return toResponse(saved);
    }

    @Transactional
    public StoreResponse suspendStore(UUID storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (store.getApprovalStatus() != Store.ApprovalStatus.APPROVED) {
            throw new RuntimeException("Only approved stores can be suspended");
        }

        store.setStatus(Store.StoreStatus.SUSPENDED);
        Store saved = storeRepository.save(store);
        return toResponse(saved);
    }

    @Transactional
    public StoreResponse reactivateStore(UUID storeId) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (store.getApprovalStatus() != Store.ApprovalStatus.APPROVED) {
            throw new RuntimeException("Only approved stores can be reactivated");
        }

        store.setStatus(Store.StoreStatus.ACTIVE);
        Store saved = storeRepository.save(store);
        return toResponse(saved);
    }

    @Transactional
    public StoreResponse updateStore(UUID userId, StoreRequest request) {
        Store store = storeRepository.findByOwnerId(userId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (request.getName() != null && !request.getName().equals(store.getName())) {
            if (storeRepository.existsByName(request.getName())) {
                throw new RuntimeException("Store name already exists");
            }
            store.setName(request.getName());
        }

        if (request.getDescription() != null) {
            store.setDescription(request.getDescription());
        }
        if (request.getLogo() != null) {
            store.setLogo(request.getLogo());
        }
        if (request.getBanner() != null) {
            store.setBanner(request.getBanner());
        }
        if (request.getContactEmail() != null) {
            store.setContactEmail(request.getContactEmail());
        }
        if (request.getPhone() != null) {
            store.setPhone(request.getPhone());
        }
        if (request.getAddress() != null) {
            store.setAddress(request.getAddress());
        }

        Store saved = storeRepository.save(store);
        return toResponse(saved);
    }

    private String generateSlug(String input) {
        if (input == null || input.isBlank()) {
            return "";
        }
        String slug = input.toLowerCase()
                .replaceAll("\\s+", "-")
                .replaceAll("[^a-z0-9-]", "");
        if (!SLUG_PATTERN.matcher(slug).matches()) {
            slug = slug.replaceAll("-+", "-");
        }
        return slug;
    }

    private StoreResponse toResponse(Store store) {
        // Ensure owner is initialized within transactional context
        User owner = store.getOwner();

        return StoreResponse.builder()
                .id(store.getId())
                .ownerId(owner.getId())
                .ownerName(owner.getName())
                .ownerEmail(owner.getEmail())
                .name(store.getName())
                .slug(store.getSlug())
                .description(store.getDescription())
                .logo(store.getLogo())
                .banner(store.getBanner())
                .contactEmail(store.getContactEmail())
                .phone(store.getPhone())
                .address(store.getAddress())
                .commissionRate(store.getCommissionRate())
                .status(store.getStatus().name())
                .approvalStatus(store.getApprovalStatus().name())
                .rejectionReason(store.getRejectionReason())
                .approvedAt(store.getApprovedAt())
                .approvedBy(store.getApprovedBy())
                .totalSales(store.getTotalSales())
                .totalOrders(store.getTotalOrders())
                .rating(store.getRating())
                .createdAt(store.getCreatedAt())
                .updatedAt(store.getUpdatedAt())
                .build();
    }
}
