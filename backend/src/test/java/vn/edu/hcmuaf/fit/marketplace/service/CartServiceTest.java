package vn.edu.hcmuaf.fit.marketplace.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import vn.edu.hcmuaf.fit.marketplace.dto.request.CartItemRequest;
import vn.edu.hcmuaf.fit.marketplace.entity.Cart;
import vn.edu.hcmuaf.fit.marketplace.entity.CartItem;
import vn.edu.hcmuaf.fit.marketplace.entity.Product;
import vn.edu.hcmuaf.fit.marketplace.entity.User;
import vn.edu.hcmuaf.fit.marketplace.exception.ForbiddenException;
import vn.edu.hcmuaf.fit.marketplace.repository.CartRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductVariantRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.UserRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductVariantRepository productVariantRepository;
    @Mock
    private StoreRepository storeRepository;

    private CartService cartService;

    @BeforeEach
    void setUp() {
        cartService = new CartService(
                cartRepository,
                userRepository,
                productRepository,
                productVariantRepository,
                storeRepository
        );
    }

    @Test
    void getCartByUserIdReturnsExistingCartWhenDuplicateInsertRaceOccurs() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("customer@example.com")
                .password("secret")
                .name("Customer")
                .build();
        Cart existing = Cart.builder()
                .id(UUID.randomUUID())
                .user(user)
                .build();

        when(cartRepository.findByUserIdWithItems(userId))
                .thenReturn(Optional.empty(), Optional.of(existing));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cartRepository.save(any(Cart.class)))
                .thenThrow(new DataIntegrityViolationException(
                        "duplicate key value violates unique constraint \"uk_64t7ox312pqal3p7fg9o503c2\" Detail: Key (user_id)=(...) already exists."
                ));

        Cart actual = cartService.getCartByUserId(userId);

        assertSame(existing, actual);
    }

    @Test
    void getCartByUserIdRethrowsOtherDataIntegrityViolations() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("customer2@example.com")
                .password("secret")
                .name("Customer 2")
                .build();

        when(cartRepository.findByUserIdWithItems(userId)).thenReturn(Optional.empty());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cartRepository.save(any(Cart.class)))
                .thenThrow(new DataIntegrityViolationException("some other integrity violation"));

        assertThrows(DataIntegrityViolationException.class, () -> cartService.getCartByUserId(userId));
    }

    @Test
    void addItemRejectsProductFromUsersOwnStore() {
        UUID userId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        User user = userWithStore(userId, storeId);
        Cart cart = cartForUser(user);
        Product product = product(productId, storeId);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserIdWithItems(userId)).thenReturn(Optional.of(cart));
        when(productRepository.findPublicById(productId)).thenReturn(Optional.of(product));

        ForbiddenException ex = assertThrows(
                ForbiddenException.class,
                () -> cartService.addItem(userId, CartItemRequest.builder()
                        .productId(productId)
                        .quantity(1)
                        .build())
        );

        assertEquals("Khong the mua san pham tu gian hang cua chinh ban.", ex.getMessage());
        verify(cartRepository, never()).save(any(Cart.class));
    }

    @Test
    void addItemAllowsVendorToBuyFromAnotherStore() {
        UUID userId = UUID.randomUUID();
        UUID userStoreId = UUID.randomUUID();
        UUID productId = UUID.randomUUID();
        User user = userWithStore(userId, userStoreId);
        Cart cart = cartForUser(user);
        Product product = product(productId, UUID.randomUUID());

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserIdWithItems(userId)).thenReturn(Optional.of(cart));
        when(productRepository.findPublicById(productId)).thenReturn(Optional.of(product));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Cart actual = cartService.addItem(userId, CartItemRequest.builder()
                .productId(productId)
                .quantity(2)
                .build());

        assertEquals(1, actual.getItems().size());
        assertSame(product, actual.getItems().get(0).getProduct());
        assertEquals(2, actual.getItems().get(0).getQuantity());
    }

    @Test
    void updateItemQuantityRejectsExistingOwnStoreItem() {
        UUID userId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        User user = userWithStore(userId, storeId);
        Product product = product(UUID.randomUUID(), storeId);
        Cart cart = cartForUser(user);
        CartItem item = cartItem(itemId, cart, product);
        cart.getItems().add(item);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cartRepository.findByUserIdWithItems(userId)).thenReturn(Optional.of(cart));

        ForbiddenException ex = assertThrows(
                ForbiddenException.class,
                () -> cartService.updateItemQuantity(userId, itemId, 3)
        );

        assertEquals("Khong the mua san pham tu gian hang cua chinh ban.", ex.getMessage());
        assertEquals(1, item.getQuantity());
        verify(cartRepository, never()).save(any(Cart.class));
    }

    @Test
    void removeItemAllowsExistingOwnStoreItemCleanup() {
        UUID userId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        User user = userWithStore(userId, storeId);
        Cart cart = cartForUser(user);
        cart.getItems().add(cartItem(itemId, cart, product(UUID.randomUUID(), storeId)));

        when(cartRepository.findByUserIdWithItems(userId)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Cart actual = cartService.removeItem(userId, itemId);

        assertTrue(actual.getItems().isEmpty());
    }

    private User userWithStore(UUID userId, UUID storeId) {
        return User.builder()
                .id(userId)
                .email("vendor@example.com")
                .password("secret")
                .storeId(storeId)
                .role(User.Role.VENDOR)
                .build();
    }

    private Cart cartForUser(User user) {
        return Cart.builder()
                .id(UUID.randomUUID())
                .user(user)
                .items(new ArrayList<>())
                .build();
    }

    private Product product(UUID productId, UUID storeId) {
        return Product.builder()
                .id(productId)
                .name("T-Shirt")
                .storeId(storeId)
                .basePrice(new BigDecimal("100000"))
                .stockQuantity(10)
                .build();
    }

    private CartItem cartItem(UUID itemId, Cart cart, Product product) {
        return CartItem.builder()
                .id(itemId)
                .cart(cart)
                .product(product)
                .quantity(1)
                .unitPrice(product.getEffectivePrice())
                .build();
    }
}
