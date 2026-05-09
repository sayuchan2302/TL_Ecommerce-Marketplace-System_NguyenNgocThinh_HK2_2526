BEGIN;

CREATE TEMP TABLE cleanup_fixture_products ON COMMIT DROP AS
SELECT id, sku
FROM products
WHERE name LIKE 'Review Fixture %'
   OR name LIKE 'Lookup Product %'
   OR name LIKE 'IT Product %'
   OR name LIKE 'Unpurchased %'
   OR name LIKE 'Return Fixture %'
   OR sku LIKE 'RV-P-%'
   OR sku LIKE 'LOOKUP-P-%'
   OR sku LIKE 'IT-P-%'
   OR sku LIKE 'UNPUR-%'
   OR sku LIKE 'RT-P-%'
   OR slug LIKE 'review-fixture-%'
   OR slug LIKE 'lookup-product-%'
   OR slug LIKE 'it-product-%'
   OR slug LIKE 'unpurchased-%'
   OR slug LIKE 'return-fixture-%';

CREATE TEMP TABLE cleanup_fixture_users ON COMMIT DROP AS
SELECT id
FROM users
WHERE email LIKE 'migration-test-%@local';

CREATE TEMP TABLE cleanup_fixture_coupons ON COMMIT DROP AS
SELECT id, code
FROM coupons
WHERE code LIKE 'CPN-IT-%'
   OR code LIKE 'MIGRC%';

CREATE TEMP TABLE cleanup_fixture_orders ON COMMIT DROP AS
SELECT DISTINCT o.id
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.order_code LIKE 'ORD-RV-%'
   OR o.order_code LIKE 'ORD-LOOKUP-%'
   OR o.order_code LIKE 'ORD-IT-%'
   OR o.order_code LIKE 'ORD-RT-%'
   OR o.order_code LIKE 'ORD-ST-%'
   OR o.order_code LIKE 'ORD-MIGR-%'
   OR o.user_id IN (SELECT id FROM cleanup_fixture_users)
   OR o.coupon_code IN (SELECT code FROM cleanup_fixture_coupons)
   OR oi.product_id IN (SELECT id FROM cleanup_fixture_products);

CREATE TEMP TABLE cleanup_fixture_returns ON COMMIT DROP AS
SELECT DISTINCT rr.id
FROM return_requests rr
WHERE rr.return_code LIKE 'RT-LOOKUP-%'
   OR rr.return_code LIKE 'RT-IT-%'
   OR rr.order_id IN (SELECT id FROM cleanup_fixture_orders);

CREATE TEMP TABLE cleanup_fixture_reviews ON COMMIT DROP AS
SELECT DISTINCT r.id
FROM reviews r
WHERE r.order_id IN (SELECT id FROM cleanup_fixture_orders)
   OR r.product_id IN (SELECT id FROM cleanup_fixture_products)
   OR r.title IN ('Integration test review', 'Fixture review')
   OR r.content IN ('Flow works end to end.', 'Customer feedback fixture');

CREATE TEMP TABLE cleanup_fixture_vouchers ON COMMIT DROP AS
SELECT id, code
FROM vouchers
WHERE code ~ '^(MKT|FOL|RMD)[0-9]{10,}$'
   OR name IN (
        'Marketplace Campaign Integration',
        'Follower Promo Integration',
        'Reminder Campaign Integration'
   )
   OR description IN (
        'Integration test for marketplace campaign endpoint',
        'Follower should receive promotion notification',
        'Reminder integration test'
   );

CREATE TEMP TABLE cleanup_fixture_promo_events ON COMMIT DROP AS
SELECT id
FROM promotion_notification_events
WHERE voucher_code IN (SELECT code FROM cleanup_fixture_vouchers)
   OR voucher_code ~ '^(MKT|FOL|RMD)[0-9]{10,}$'
   OR event_key LIKE 'MARKETPLACE_NEW:MKT%'
   OR event_key LIKE 'MARKETPLACE_NEW:RMD%';

CREATE TEMP TABLE cleanup_fixture_notifications ON COMMIT DROP AS
SELECT DISTINCT n.id
FROM notifications n
LEFT JOIN promotion_notification_dispatches d ON d.notification_id = n.id
WHERE d.event_id IN (SELECT id FROM cleanup_fixture_promo_events)
   OR n.title ~ '(MKT|FOL|RMD)[0-9]{10,}'
   OR n.message ~ '(MKT|FOL|RMD)[0-9]{10,}'
   OR (
        n.type = 'REVIEW'
        AND n.link = '/profile?tab=reviews'
        AND EXISTS (SELECT 1 FROM cleanup_fixture_reviews)
   );

CREATE TEMP TABLE cleanup_fixture_addresses ON COMMIT DROP AS
SELECT id
FROM addresses
WHERE user_id IN (SELECT id FROM cleanup_fixture_users)
   OR (
        detail = '1 Test Street'
        AND user_id IN (
            SELECT id
            FROM users
            WHERE email IN (
                'minh.customer@fashion.local',
                'lan.customer@fashion.local',
                'huy.customer@fashion.local',
                'admin@fashion.local',
                'an.shop@fashion.local'
            )
        )
   );

CREATE TEMP TABLE cleanup_counts (kind text, deleted_count integer) ON COMMIT DROP;

WITH deleted AS (
    DELETE FROM notifications
    WHERE id IN (SELECT id FROM cleanup_fixture_notifications)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'notifications', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM promotion_notification_dispatches
    WHERE event_id IN (SELECT id FROM cleanup_fixture_promo_events)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'promotion_notification_dispatches', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM promotion_notification_events
    WHERE id IN (SELECT id FROM cleanup_fixture_promo_events)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'promotion_notification_events', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM customer_vouchers
    WHERE voucher_id IN (SELECT id FROM cleanup_fixture_vouchers)
       OR used_order_id IN (SELECT id FROM cleanup_fixture_orders)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'customer_vouchers', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM store_follows
    WHERE user_id IN (SELECT id FROM users WHERE email = 'minh.customer@fashion.local')
      AND store_id IN (SELECT id FROM stores WHERE slug = 'an-urban')
      AND EXISTS (SELECT 1 FROM cleanup_fixture_vouchers WHERE code LIKE 'FOL%')
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'store_follows', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM vouchers
    WHERE id IN (SELECT id FROM cleanup_fixture_vouchers)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'vouchers', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM bot_scenario_revisions
    WHERE payload_json LIKE '%Ban hay chon chuc nang de tiep tuc.%'
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'bot_scenario_revisions', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM admin_audit_logs
    WHERE actor_email = 'admin@fashion.local'
      AND action = 'UPDATE_BANK_VERIFICATION'
      AND note = 'KYC approved'
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'admin_audit_logs', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM wallet_transactions
    WHERE order_id IN (SELECT id FROM cleanup_fixture_orders)
       OR return_request_id IN (SELECT id FROM cleanup_fixture_returns)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'wallet_transactions', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM customer_wallet_transactions
    WHERE order_id IN (SELECT id FROM cleanup_fixture_orders)
       OR return_request_id IN (SELECT id FROM cleanup_fixture_returns)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'customer_wallet_transactions', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM return_items
    WHERE return_request_id IN (SELECT id FROM cleanup_fixture_returns)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'return_items', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM return_requests
    WHERE id IN (SELECT id FROM cleanup_fixture_returns)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'return_requests', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM review_images
    WHERE review_id IN (SELECT id FROM cleanup_fixture_reviews)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'review_images', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM reviews
    WHERE id IN (SELECT id FROM cleanup_fixture_reviews)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'reviews', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM order_status_logs
    WHERE order_id IN (SELECT id FROM cleanup_fixture_orders)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'order_status_logs', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM order_items
    WHERE order_id IN (SELECT id FROM cleanup_fixture_orders)
       OR product_id IN (SELECT id FROM cleanup_fixture_products)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'order_items', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM orders
    WHERE id IN (SELECT id FROM cleanup_fixture_orders)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'orders', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM cart_items
    WHERE product_id IN (SELECT id FROM cleanup_fixture_products)
       OR variant_id IN (
            SELECT id
            FROM product_variants
            WHERE product_id IN (SELECT id FROM cleanup_fixture_products)
       )
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'cart_items', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM wishlists
    WHERE product_id IN (SELECT id FROM cleanup_fixture_products)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'wishlists', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM flash_sale_items
    WHERE product_id IN (SELECT id FROM cleanup_fixture_products)
       OR variant_id IN (
            SELECT id
            FROM product_variants
            WHERE product_id IN (SELECT id FROM cleanup_fixture_products)
       )
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'flash_sale_items', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM product_audit_logs
    WHERE product_id IN (SELECT id FROM cleanup_fixture_products)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'product_audit_logs', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM inventory_ledger
    WHERE product_sku IN (SELECT sku FROM cleanup_fixture_products)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'inventory_ledger', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM product_variants
    WHERE product_id IN (SELECT id FROM cleanup_fixture_products)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'product_variants', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM product_images
    WHERE product_id IN (SELECT id FROM cleanup_fixture_products)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'product_images', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM products
    WHERE id IN (SELECT id FROM cleanup_fixture_products)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'products', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM coupons
    WHERE id IN (SELECT id FROM cleanup_fixture_coupons)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'coupons', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM loyalty_points
    WHERE user_id IN (SELECT id FROM cleanup_fixture_users)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'loyalty_points', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM addresses
    WHERE id IN (SELECT id FROM cleanup_fixture_addresses)
      AND NOT EXISTS (SELECT 1 FROM orders WHERE address_id = addresses.id)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'addresses', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM users
    WHERE id IN (SELECT id FROM cleanup_fixture_users)
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'users', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM vendor_wallets vw
    WHERE NOT EXISTS (
        SELECT 1
        FROM wallet_transactions wt
        WHERE wt.wallet_id = vw.id
    )
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'vendor_wallets_without_transactions', count(*) FROM deleted;

WITH deleted AS (
    DELETE FROM customer_wallets cw
    WHERE NOT EXISTS (
        SELECT 1
        FROM customer_wallet_transactions cwt
        WHERE cwt.wallet_id = cw.id
    )
    RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'customer_wallets_without_transactions', count(*) FROM deleted;

SELECT kind, deleted_count
FROM cleanup_counts
ORDER BY kind;

COMMIT;
