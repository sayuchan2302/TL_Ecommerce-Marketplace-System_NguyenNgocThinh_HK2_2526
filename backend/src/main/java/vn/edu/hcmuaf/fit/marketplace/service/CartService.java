package vn.edu.hcmuaf.fit.marketplace.service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmuaf.fit.marketplace.dto.request.CartItemRequest;
import vn.edu.hcmuaf.fit.marketplace.dto.response.CartResponse;
import vn.edu.hcmuaf.fit.marketplace.entity.Cart;
import vn.edu.hcmuaf.fit.marketplace.entity.CartItem;
import vn.edu.hcmuaf.fit.marketplace.entity.Product;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductImage;
import vn.edu.hcmuaf.fit.marketplace.entity.ProductVariant;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.exception.ResourceNotFoundException;
import vn.edu.hcmuaf.fit.marketplace.repository.CartRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductVariantRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CartService {

    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final StoreRepository storeRepository;

    public CartService(
            CartRepository cartRepository,
            UserRepository userRepository,
            ProductRepository productRepository,
            ProductVariantRepository productVariantRepository,
            StoreRepository storeRepository
    ) {
        this.cartRepository = cartRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.productVariantRepository = productVariantRepository;
        this.storeRepository = storeRepository;
    }

    @Transactional
    public Cart getCartByUserId(UUID userId) {
        return cartRepository.findByUserIdWithItems(userId)
                .orElseGet(() -> createCartForUserOrLoadExisting(userId));
    }

    @Transactional
    public CartResponse getCartResponseByUserId(UUID userId) {
        return toResponse(getCartByUserId(userId));
    }

    @Transactional
    public CartResponse addItemResponse(UUID userId, CartItemRequest request) {
        return toResponse(addItem(userId, request));
    }

    @Transactional
    public CartResponse updateItemQuantityResponse(UUID userId, UUID itemId, Integer quantity) {
        return toResponse(updateItemQuantity(userId, itemId, quantity));
    }

    @Transactional
    public CartResponse removeItemResponse(UUID userId, UUID itemId) {
        return toResponse(removeItem(userId, itemId));
    }

    private Cart createCartForUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Cart cart = Cart.builder()
                .user(user)
                .totalAmount(BigDecimal.ZERO)
                .build();

        return cartRepository.save(cart);
    }

    private Cart createCartForUserOrLoadExisting(UUID userId) {
        try {
            return createCartForUser(userId);
        } catch (DataIntegrityViolationException ex) {
            if (!isDuplicateCartForUserViolation(ex)) {
                throw ex;
            }
            return cartRepository.findByUserIdWithItems(userId).orElseThrow(() -> ex);
        }
    }

    private boolean isDuplicateCartForUserViolation(DataIntegrityViolationException ex) {
        Throwable current = ex;
        while (current != null) {
            String message = current.getMessage();
            if (message != null) {
                String normalized = message.toLowerCase(Locale.ROOT);
                boolean duplicateUserId = normalized.contains("duplicate key value")
                        && normalized.contains("user_id");
                boolean knownConstraint = normalized.contains("uk_64t7ox312pqal3p7fg9o503c2")
                        || normalized.contains("carts_user_id_key");
                if (duplicateUserId || knownConstraint) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

    @Transactional
    public Cart addItem(UUID userId, CartItemRequest request) {
        Cart cart = getCartByUserId(userId);

        Product product = productRepository.findPublicById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        final ProductVariant variant;
        if (request.getVariantId() != null) {
            variant = productVariantRepository.findById(request.getVariantId())
                    .filter(found -> found.getProduct().getId().equals(product.getId()))
                    .filter(found -> Boolean.TRUE.equals(found.getIsActive()))
                    .orElseThrow(() -> new ResourceNotFoundException("Variant not found"));
        } else {
            variant = null;
        }

        final ProductVariant finalVariant = variant;
        CartItem existingItem = cart.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(product.getId()))
                .filter(item -> (finalVariant == null && item.getVariant() == null)
                        || (finalVariant != null && finalVariant.equals(item.getVariant())))
                .findFirst()
                .orElse(null);

        if (existingItem != null) {
            existingItem.setQuantity(existingItem.getQuantity() + request.getQuantity());
            existingItem.setUnitPrice(finalVariant != null ? finalVariant.getPrice() : product.getEffectivePrice());
        } else {
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .product(product)
                    .variant(finalVariant)
                    .quantity(request.getQuantity())
                    .unitPrice(finalVariant != null ? finalVariant.getPrice() : product.getEffectivePrice())
                    .build();
            cart.getItems().add(newItem);
        }

        cart.calculateTotal();
        return cartRepository.save(cart);
    }

    @Transactional
    public Cart updateItemQuantity(UUID userId, UUID itemId, Integer quantity) {
        Cart cart = getCartByUserId(userId);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Cart item not found"));

        if (quantity <= 0) {
            cart.getItems().remove(item);
        } else {
            item.setQuantity(quantity);
        }

        cart.calculateTotal();
        return cartRepository.save(cart);
    }

    @Transactional
    public Cart removeItem(UUID userId, UUID itemId) {
        Cart cart = getCartByUserId(userId);

        cart.getItems().removeIf(item -> item.getId().equals(itemId));
        cart.calculateTotal();

        return cartRepository.save(cart);
    }

    @Transactional
    public void clearCart(UUID userId) {
        Cart cart = getCartByUserId(userId);
        cart.getItems().clear();
        cart.setTotalAmount(BigDecimal.ZERO);
        cartRepository.save(cart);
    }

    public CartResponse toResponse(Cart cart) {
        if (cart == null) {
            return CartResponse.builder()
                    .id(null)
                    .totalAmount(BigDecimal.ZERO)
                    .items(List.of())
                    .build();
        }

        List<CartItem> items = cart.getItems() == null ? List.of() : cart.getItems();
        List<UUID> productIds = items.stream()
                .map(CartItem::getProduct)
                .filter(product -> product != null && product.getId() != null)
                .map(Product::getId)
                .distinct()
                .collect(Collectors.toList());

        Map<UUID, Product> productDetailsById = new HashMap<>();
        if (!productIds.isEmpty()) {
            productRepository.findAllByIdInWithImages(productIds).forEach(product -> {
                if (product.getId() != null) {
                    productDetailsById.put(product.getId(), product);
                }
            });
        }

        List<UUID> storeIds = productDetailsById.values().stream()
                .map(Product::getStoreId)
                .filter(storeId -> storeId != null)
                .distinct()
                .collect(Collectors.toList());
        Map<UUID, Store> storesById = new HashMap<>();
        if (!storeIds.isEmpty()) {
            storeRepository.findAllById(storeIds).forEach(store -> storesById.put(store.getId(), store));
        }

        List<CartResponse.CartItemData> responseItems = new ArrayList<>(items.size());
        for (CartItem item : items) {
            Product product = item.getProduct();
            if (product == null || product.getId() == null) {
                continue;
            }

            Product productDetail = productDetailsById.getOrDefault(product.getId(), product);
            UUID storeId = productDetail.getStoreId();
            Store store = storeId == null ? null : storesById.get(storeId);
            ProductVariant variant = item.getVariant();

            CartResponse.ProductData productData = CartResponse.ProductData.builder()
                    .id(productDetail.getId())
                    .name(productDetail.getName())
                    .basePrice(productDetail.getBasePrice())
                    .salePrice(productDetail.getSalePrice())
                    .effectivePrice(productDetail.getEffectivePrice())
                    .imageUrl(resolvePrimaryImageUrl(productDetail))
                    .storeId(storeId)
                    .storeName(store != null ? store.getName() : null)
                    .officialStore(false)
                    .build();

            CartResponse.VariantData variantData = variant == null
                    ? null
                    : CartResponse.VariantData.builder()
                            .id(variant.getId())
                            .color(variant.getColor())
                            .size(variant.getSize())
                            .build();

            responseItems.add(CartResponse.CartItemData.builder()
                    .id(item.getId())
                    .quantity(item.getQuantity())
                    .unitPrice(item.getUnitPrice())
                    .totalPrice(item.getTotalPrice())
                    .product(productData)
                    .variant(variantData)
                    .build());
        }

        return CartResponse.builder()
                .id(cart.getId())
                .totalAmount(cart.getTotalAmount())
                .items(responseItems)
                .build();
    }

    private String resolvePrimaryImageUrl(Product product) {
        if (product == null || product.getImages() == null || product.getImages().isEmpty()) {
            return null;
        }

        return product.getImages().stream()
                .filter(image -> image != null && image.getUrl() != null && !image.getUrl().isBlank())
                .sorted(Comparator
                        .comparing((ProductImage image) -> Boolean.TRUE.equals(image.getIsPrimary()) ? 0 : 1)
                        .thenComparing(image -> image.getSortOrder() == null ? Integer.MAX_VALUE : image.getSortOrder()))
                .map(ProductImage::getUrl)
                .findFirst()
                .orElse(null);
    }
}
