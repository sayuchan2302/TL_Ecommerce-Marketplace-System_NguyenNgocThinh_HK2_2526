package vn.edu.hcmuaf.fit.marketplace.seeder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import vn.edu.hcmuaf.fit.marketplace.config.KaggleSeedProperties;
import vn.edu.hcmuaf.fit.marketplace.dto.request.ProductRequest;
import vn.edu.hcmuaf.fit.marketplace.entity.Category;
import vn.edu.hcmuaf.fit.marketplace.entity.Product;
import vn.edu.hcmuaf.fit.marketplace.entity.Store;
import vn.edu.hcmuaf.fit.marketplace.repository.CategoryRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.ProductRepository;
import vn.edu.hcmuaf.fit.marketplace.repository.StoreRepository;
import vn.edu.hcmuaf.fit.marketplace.service.ProductService;

import java.io.BufferedReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(prefix = "app.seed.kaggle", name = "enabled", havingValue = "true")
public class KaggleProductImportRunner {

    private static final Logger log = LoggerFactory.getLogger(KaggleProductImportRunner.class);
    private static final Set<String> ALLOWED_MASTER_CATEGORIES = Set.of("apparel", "accessories");
    private static final Set<String> ALLOWED_ROOTS = Set.of("men", "women", "accessories");
    private static final String DEFAULT_IMAGE =
            "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=672&h=990&fit=crop&fm=webp&q=80&auto=format";
    private static final AtomicBoolean EXECUTED = new AtomicBoolean(false);

    private final KaggleSeedProperties properties;
    private final ProductService productService;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final CategoryRepository categoryRepository;

    public KaggleProductImportRunner(
            KaggleSeedProperties properties,
            ProductService productService,
            ProductRepository productRepository,
            StoreRepository storeRepository,
            CategoryRepository categoryRepository
    ) {
        this.properties = properties;
        this.productService = productService;
        this.productRepository = productRepository;
        this.storeRepository = storeRepository;
        this.categoryRepository = categoryRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (!EXECUTED.compareAndSet(false, true)) {
            return;
        }
        runImport();
    }

    void runImport() {
        int targetCount = Math.max(0, properties.getTargetCount());
        if (targetCount == 0) {
            log.info("Kaggle import skipped because target-count is 0.");
            return;
        }

        List<Store> approvedActiveStores = new ArrayList<>(storeRepository.findByApprovalStatusAndStatus(
                Store.ApprovalStatus.APPROVED,
                Store.StoreStatus.ACTIVE
        ));
        approvedActiveStores.sort(Comparator.comparing(store -> store.getId().toString()));
        if (approvedActiveStores.isEmpty()) {
            log.warn("Kaggle import skipped because no APPROVED+ACTIVE stores were found.");
            return;
        }

        List<LeafCategory> leafCategories = loadLeafCategories();
        if (leafCategories.isEmpty()) {
            log.warn("Kaggle import skipped because no leaf categories under men/women/accessories were found.");
            return;
        }

        Path stylesPath;
        Path imagesPath;
        try {
            stylesPath = resolveInputPath(properties.getStylesPath());
            imagesPath = resolveInputPath(properties.getImagesPath());
        } catch (IllegalStateException ex) {
            log.error("Kaggle import skipped: {}", ex.getMessage());
            return;
        }

        Map<Long, String> imageLinks;
        List<StyleRow> styleRows;
        try {
            imageLinks = loadImageLinks(imagesPath);
            styleRows = loadStyleRows(stylesPath);
        } catch (IOException ex) {
            log.error("Kaggle import failed while reading CSV files.", ex);
            return;
        }

        List<Product> existingBatch = productRepository.findBySlugStartingWithIgnoreCase("kg-");
        if (properties.isCleanBeforeImport() && !existingBatch.isEmpty()) {
            productRepository.deleteAll(existingBatch);
            productRepository.flush();
            log.info("Removed {} existing kaggle products with slug prefix kg-.", existingBatch.size());
            existingBatch = List.of();
        }

        Set<String> existingSlugs = existingBatch.stream()
                .map(Product::getSlug)
                .filter(slug -> slug != null && !slug.isBlank())
                .map(slug -> slug.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        Map<String, LeafCategory> leafBySlug = leafCategories.stream()
                .collect(Collectors.toMap(LeafCategory::slug, leaf -> leaf));

        Map<String, List<LeafCategory>> leavesByRoot = leafCategories.stream()
                .collect(Collectors.groupingBy(
                        LeafCategory::rootSlug,
                        LinkedHashMap::new,
                        Collectors.collectingAndThen(Collectors.toList(), list -> {
                            list.sort(Comparator.comparing(LeafCategory::slug));
                            return list;
                        })
                ));

        List<Candidate> candidates = new ArrayList<>();
        for (StyleRow row : styleRows) {
            if (!ALLOWED_MASTER_CATEGORIES.contains(normalizedToken(row.masterCategory()))) {
                continue;
            }

            String slug = slugForStyle(row.styleId());
            if (existingSlugs.contains(slug)) {
                continue;
            }

            LeafCategory preferredLeaf = resolvePreferredLeaf(row, leafBySlug, leavesByRoot, leafCategories);
            String imageUrl = normalizeText(imageLinks.get(row.styleId()));
            if (imageUrl.isBlank()) {
                imageUrl = DEFAULT_IMAGE;
            }
            candidates.add(new Candidate(row, preferredLeaf, imageUrl));
        }

        if (candidates.isEmpty()) {
            log.warn("Kaggle import skipped because no eligible candidates were found.");
            return;
        }

        List<AssignedCandidate> selected = allocateCandidates(candidates, leafCategories, targetCount);
        if (selected.isEmpty()) {
            log.warn("Kaggle import skipped because allocation returned no candidates.");
            return;
        }

        int imported = 0;
        int skipped = 0;
        Map<UUID, Integer> countsByCategory = new HashMap<>();

        for (int index = 0; index < selected.size(); index++) {
            AssignedCandidate assigned = selected.get(index);
            Store store = approvedActiveStores.get(index % approvedActiveStores.size());
            ProductRequest request = buildProductRequest(assigned);
            try {
                Product created = productService.createForStore(request, store.getId());
                if (isFeaturedCandidate(assigned.candidate().row().styleId())) {
                    created.setIsFeatured(true);
                    productRepository.save(created);
                }
                imported++;
                countsByCategory.merge(assigned.assignedLeaf().id(), 1, Integer::sum);
            } catch (RuntimeException ex) {
                skipped++;
                log.warn(
                        "Skip kaggle style {} due to import error: {}",
                        assigned.candidate().row().styleId(),
                        ex.getMessage()
                );
            }
        }

        log.info(
                "Kaggle import completed: imported={}, skipped={}, target={}, stores={}, leafCategories={}",
                imported,
                skipped,
                targetCount,
                approvedActiveStores.size(),
                leafCategories.size()
        );
        log.info("Kaggle import category coverage: {} leaf categories received products.", countsByCategory.size());
    }

    private List<LeafCategory> loadLeafCategories() {
        List<Category> categories = categoryRepository.findAll();
        if (categories.isEmpty()) {
            return List.of();
        }

        Map<UUID, String> slugById = new HashMap<>();
        Map<UUID, UUID> parentById = new HashMap<>();
        Set<UUID> parentIds = new HashSet<>();

        for (Category category : categories) {
            if (category.getId() == null) {
                continue;
            }
            UUID id = category.getId();
            slugById.put(id, normalizedToken(category.getSlug()));
            UUID parentId = category.getParent() != null ? category.getParent().getId() : null;
            parentById.put(id, parentId);
            if (parentId != null) {
                parentIds.add(parentId);
            }
        }

        List<LeafCategory> leaves = new ArrayList<>();
        for (Category category : categories) {
            UUID id = category.getId();
            if (id == null || parentIds.contains(id)) {
                continue;
            }
            if (!Boolean.TRUE.equals(category.getIsVisible())) {
                continue;
            }
            String slug = normalizedToken(category.getSlug());
            if (slug.isBlank()) {
                continue;
            }
            String rootSlug = resolveRootSlug(id, slugById, parentById);
            if (!ALLOWED_ROOTS.contains(rootSlug)) {
                continue;
            }
            UUID parentId = parentById.get(id);
            leaves.add(new LeafCategory(id, slug, parentId, rootSlug));
        }

        leaves.sort(Comparator.comparing(LeafCategory::slug));
        return leaves;
    }

    private String resolveRootSlug(UUID categoryId, Map<UUID, String> slugById, Map<UUID, UUID> parentById) {
        UUID current = categoryId;
        Set<UUID> visited = new HashSet<>();
        while (current != null && visited.add(current)) {
            UUID parentId = parentById.get(current);
            if (parentId == null) {
                String slug = slugById.get(current);
                return slug == null ? "" : slug;
            }
            current = parentId;
        }
        return "";
    }

    private LeafCategory resolvePreferredLeaf(
            StyleRow row,
            Map<String, LeafCategory> leafBySlug,
            Map<String, List<LeafCategory>> leavesByRoot,
            List<LeafCategory> allLeaves
    ) {
        String preferredSlug = choosePreferredLeafSlug(row);
        if (!preferredSlug.isBlank()) {
            LeafCategory direct = leafBySlug.get(preferredSlug);
            if (direct != null) {
                return direct;
            }
        }

        String root = resolveSourceRoot(row);
        List<LeafCategory> sameRoot = leavesByRoot.getOrDefault(root, List.of());
        if (!sameRoot.isEmpty()) {
            return sameRoot.get(0);
        }
        return allLeaves.get(0);
    }

    private List<AssignedCandidate> allocateCandidates(
            List<Candidate> candidates,
            List<LeafCategory> leafCategories,
            int targetCount
    ) {
        List<Candidate> sortedCandidates = new ArrayList<>(candidates);
        sortedCandidates.sort(Comparator.comparingLong(candidate -> candidate.row().styleId()));
        Deque<Candidate> global = new ArrayDeque<>(sortedCandidates);

        Map<UUID, Deque<Candidate>> byPreferredLeaf = new HashMap<>();
        for (Candidate candidate : sortedCandidates) {
            byPreferredLeaf.computeIfAbsent(candidate.preferredLeaf().id(), ignored -> new ArrayDeque<>())
                    .add(candidate);
        }

        Map<UUID, List<LeafCategory>> siblingLeaves = leafCategories.stream()
                .collect(Collectors.groupingBy(
                        LeafCategory::parentId,
                        LinkedHashMap::new,
                        Collectors.collectingAndThen(Collectors.toList(), list -> {
                            list.sort(Comparator.comparing(LeafCategory::slug));
                            return list;
                        })
                ));

        Map<String, List<LeafCategory>> leavesByRoot = leafCategories.stream()
                .collect(Collectors.groupingBy(
                        LeafCategory::rootSlug,
                        LinkedHashMap::new,
                        Collectors.collectingAndThen(Collectors.toList(), list -> {
                            list.sort(Comparator.comparing(LeafCategory::slug));
                            return list;
                        })
                ));

        int effectiveTarget = Math.min(targetCount, sortedCandidates.size());
        int baseQuota = effectiveTarget / leafCategories.size();
        int remainder = effectiveTarget % leafCategories.size();

        Set<Long> usedStyleIds = new LinkedHashSet<>();
        List<AssignedCandidate> assigned = new ArrayList<>(effectiveTarget);

        for (int index = 0; index < leafCategories.size(); index++) {
            LeafCategory leaf = leafCategories.get(index);
            int quota = baseQuota + (index < remainder ? 1 : 0);
            if (quota <= 0) {
                continue;
            }

            for (int done = 0; done < quota; done++) {
                Candidate picked = pollCandidate(byPreferredLeaf.get(leaf.id()), usedStyleIds);

                if (picked == null) {
                    List<LeafCategory> siblings = siblingLeaves.getOrDefault(leaf.parentId(), List.of());
                    picked = pollFromLeaves(siblings, byPreferredLeaf, usedStyleIds, leaf.id());
                }

                if (picked == null) {
                    List<LeafCategory> sameRoot = leavesByRoot.getOrDefault(leaf.rootSlug(), List.of());
                    picked = pollFromLeaves(sameRoot, byPreferredLeaf, usedStyleIds, leaf.id());
                }

                if (picked == null) {
                    picked = pollCandidate(global, usedStyleIds);
                }

                if (picked == null) {
                    break;
                }

                usedStyleIds.add(picked.row().styleId());
                assigned.add(new AssignedCandidate(picked, leaf));
            }
        }

        return assigned;
    }

    private Candidate pollFromLeaves(
            List<LeafCategory> leaves,
            Map<UUID, Deque<Candidate>> byPreferredLeaf,
            Set<Long> usedStyleIds,
            UUID excludeLeafId
    ) {
        for (LeafCategory leaf : leaves) {
            if (leaf.id().equals(excludeLeafId)) {
                continue;
            }
            Candidate picked = pollCandidate(byPreferredLeaf.get(leaf.id()), usedStyleIds);
            if (picked != null) {
                return picked;
            }
        }
        return null;
    }

    private Candidate pollCandidate(Deque<Candidate> queue, Set<Long> usedStyleIds) {
        if (queue == null) {
            return null;
        }
        while (!queue.isEmpty()) {
            Candidate candidate = queue.pollFirst();
            if (candidate == null) {
                continue;
            }
            if (!usedStyleIds.contains(candidate.row().styleId())) {
                return candidate;
            }
        }
        return null;
    }

    private ProductRequest buildProductRequest(AssignedCandidate assigned) {
        StyleRow row = assigned.candidate().row();
        LeafCategory leaf = assigned.assignedLeaf();
        PricePlan pricePlan = planPrice(leaf.slug(), row.styleId());

        String usage = normalizedUsage(row.usage());
        String season = normalizedSeason(row.season());
        String color = normalizedColor(row.baseColour());
        String articleType = fallbackText(row.articleType(), "Fashion item");
        String productName = fallbackText(row.productDisplayName(), articleType + " " + row.styleId());
        String normalizedName = normalizeText(productName);
        if (normalizedName.isBlank()) {
            normalizedName = "Kaggle Item " + row.styleId();
        }

        List<ProductRequest.VariantRequest> variants = buildVariants(leaf, row.styleId(), color);

        return ProductRequest.builder()
                .name(normalizedName)
                .slug(slugForStyle(row.styleId()))
                .description(buildDescription(row, usage, season))
                .highlights("Kaggle import | " + articleType + " | " + usage)
                .careInstructions("Machine wash cold. Do not bleach. Imported dataset product.")
                .categoryId(leaf.id())
                .basePrice(pricePlan.basePrice())
                .salePrice(pricePlan.salePrice())
                .material(selectMaterial(row.styleId()))
                .fit(selectFit(row.styleId()))
                .gender(resolveGender(row.gender()))
                .status(Product.ProductStatus.ACTIVE.name())
                .imageUrl(fallbackText(assigned.candidate().imageUrl(), DEFAULT_IMAGE))
                .variants(variants)
                .build();
    }

    private List<ProductRequest.VariantRequest> buildVariants(LeafCategory leaf, long styleId, String color) {
        int baseStock = 12 + (int) Math.floorMod(styleId, 48);
        String stockColor = fallbackText(color, "Mixed");

        if ("accessories".equals(leaf.rootSlug())) {
            ProductRequest.VariantRequest variant = ProductRequest.VariantRequest.builder()
                    .color(stockColor)
                    .size("Free")
                    .stockQuantity(baseStock)
                    .priceAdjustment(BigDecimal.ZERO)
                    .isActive(true)
                    .build();
            return List.of(variant);
        }

        String firstSize;
        String secondSize;
        if ("women".equals(leaf.rootSlug())) {
            firstSize = "S";
            secondSize = "M";
        } else {
            firstSize = "M";
            secondSize = "L";
        }

        ProductRequest.VariantRequest first = ProductRequest.VariantRequest.builder()
                .color(stockColor)
                .size(firstSize)
                .stockQuantity(baseStock)
                .priceAdjustment(BigDecimal.ZERO)
                .isActive(true)
                .build();
        ProductRequest.VariantRequest second = ProductRequest.VariantRequest.builder()
                .color(stockColor)
                .size(secondSize)
                .stockQuantity(Math.max(1, baseStock - 4))
                .priceAdjustment(BigDecimal.ZERO)
                .isActive(true)
                .build();
        return List.of(first, second);
    }

    private PricePlan planPrice(String leafSlug, long styleId) {
        int minK;
        int maxK;

        if (leafSlug.contains("dong-ho")) {
            minK = 399;
            maxK = 1999;
        } else if (leafSlug.contains("trang-suc")) {
            minK = 159;
            maxK = 1099;
        } else if (leafSlug.contains("ao-khoac") || leafSlug.contains("vay")) {
            minK = 299;
            maxK = 1299;
        } else if (leafSlug.contains("quan")) {
            minK = 249;
            maxK = 899;
        } else if (leafSlug.contains("accessories")
                || leafSlug.contains("tui")
                || leafSlug.contains("vi")
                || leafSlug.contains("that-lung")
                || leafSlug.contains("khan")
                || leafSlug.contains("tat")
                || leafSlug.contains("kinh")
                || leafSlug.contains("non")
                || leafSlug.contains("balo")) {
            minK = 129;
            maxK = 799;
        } else {
            minK = 199;
            maxK = 799;
        }

        long spread = (long) maxK - minK + 1L;
        long baseK = minK + Math.floorMod(styleId, spread);
        BigDecimal basePrice = BigDecimal.valueOf(baseK * 1_000L);

        BigDecimal salePrice = null;
        if (Math.floorMod(styleId, 10) < 7) {
            int discountPct = 5 + (int) Math.floorMod(styleId, 16);
            long sale = (basePrice.longValue() * (100L - discountPct)) / 100L;
            sale = (sale / 1_000L) * 1_000L;
            if (sale > 0 && sale < basePrice.longValue()) {
                salePrice = BigDecimal.valueOf(sale);
            }
        }
        return new PricePlan(basePrice, salePrice);
    }

    private String buildDescription(StyleRow row, String usage, String season) {
        String article = fallbackText(row.articleType(), "Fashion");
        String subCategory = fallbackText(row.subCategory(), "General");
        String master = fallbackText(row.masterCategory(), "Apparel");
        return "Imported from Kaggle dataset. "
                + "Master category: " + master + ". "
                + "Sub-category: " + subCategory + ". "
                + "Article type: " + article + ". "
                + "Usage: " + usage + ". "
                + "Season: " + season + ".";
    }

    private String selectMaterial(long styleId) {
        String[] options = {"Cotton", "Polyester Blend", "Linen Blend", "Denim", "Knitted"};
        return options[(int) Math.floorMod(styleId, options.length)];
    }

    private String selectFit(long styleId) {
        String[] options = {"Regular", "Slim", "Relaxed", "Comfort"};
        return options[(int) Math.floorMod(styleId, options.length)];
    }

    private String resolveGender(String rawGender) {
        String gender = normalizedToken(rawGender);
        if (gender.equals("women") || gender.equals("girls")) {
            return Product.Gender.FEMALE.name();
        }
        if (gender.equals("men") || gender.equals("boys")) {
            return Product.Gender.MALE.name();
        }
        return Product.Gender.UNISEX.name();
    }

    private boolean isFeaturedCandidate(long styleId) {
        return Math.floorMod(styleId, 10) == 0;
    }

    private String slugForStyle(long styleId) {
        return ("kg-" + styleId).toLowerCase(Locale.ROOT);
    }

    private String choosePreferredLeafSlug(StyleRow row) {
        String article = normalizedToken(row.articleType());
        String subCategory = normalizedToken(row.subCategory());
        String usage = normalizedToken(row.usage());
        boolean female = isFemale(row.gender());
        boolean male = isMale(row.gender());

        String byArticle = mapByArticleType(article, subCategory, usage, female, male, row.masterCategory());
        if (!byArticle.isBlank()) {
            return byArticle;
        }

        String bySubCategory = mapBySubCategory(subCategory, usage, female, male, row.masterCategory());
        if (!bySubCategory.isBlank()) {
            return bySubCategory;
        }

        String byUsage = mapByUsage(usage, female, male, row.masterCategory());
        if (!byUsage.isBlank()) {
            return byUsage;
        }

        return mapByGender(female, male, row.masterCategory());
    }

    private String mapByArticleType(
            String article,
            String subCategory,
            String usage,
            boolean female,
            boolean male,
            String masterCategory
    ) {
        String normalizedMaster = normalizedToken(masterCategory);
        if ("accessories".equals(normalizedMaster)) {
            if (containsAny(article, "handbag", "tote", "hobo", "satchel", "clutch", "bag")) return "tui-xach";
            if (containsAny(article, "messenger", "crossbody", "sling")) return "tui-deo-cheo";
            if (containsAny(article, "backpack", "backpacks")) return "balo";
            if (containsAny(article, "wallet", "wallets")) return "vi";
            if (containsAny(article, "belt", "belts")) return "that-lung";
            if (containsAny(article, "cap", "caps", "hat", "hats", "beanie")) return "non-mu";
            if (containsAny(article, "scarf", "scarves", "stole", "dupatta")) return "khan";
            if (containsAny(article, "sock", "socks")) return "tat";
            if (containsAny(article, "sunglass", "eyewear", "frame", "frames")) return "kinh-mat";
            if (containsAny(article, "watch", "watches")) return "dong-ho";
            if (containsAny(article, "ring", "earring", "necklace", "bracelet", "jewellery", "jewelry")) return "trang-suc";
        }

        if (containsAny(article, "polo")) return male ? "men-ao-polo" : "women-ao-kieu";
        if (containsAny(article, "shirt", "shirts")) return female ? "women-ao-so-mi" : "men-ao-so-mi";
        if (containsAny(article, "hoodie", "sweatshirt")) return female ? "women-ao-khoac" : "men-ao-hoodie";
        if (containsAny(article, "sweater", "pullover", "cardigan", "shrug", "jacket", "coat", "blazer")) {
            return female ? "women-ao-khoac" : "men-ao-len";
        }
        if (containsAny(article, "tshirt", "t-shirt", "tees", "tee", "top", "tops", "camisole", "vest", "tank")) {
            return female ? "women-ao-thun" : "men-ao-thun";
        }
        if (containsAny(article, "dress", "dresses", "gown", "kurta", "kurtas", "saree", "skirt", "lehenga")) {
            if (female || containsAny(subCategory, "dress")) {
                return mapFemaleDressByUsage(usage);
            }
            return "men-ao-thun";
        }
        if (containsAny(article, "jean", "jeans", "jeggings")) return female ? "women-quan-jeans" : "men-quan-jeans";
        if (containsAny(article, "legging", "leggings", "tights")) return female ? "women-quan-legging" : "men-quan-jogger";
        if (containsAny(article, "short", "shorts", "capri", "capris")) return female ? "women-quan-short" : "men-quan-short";
        if (containsAny(article, "trouser", "trousers", "chino", "chinos", "pant", "pants")) {
            if (containsAny(usage, "sports")) {
                return female ? "women-quan-the-thao" : "men-quan-the-thao";
            }
            return female ? "women-quan-tay" : "men-quan-tay";
        }
        if (containsAny(article, "tracksuit", "sports bra", "jersey", "training")) {
            if (containsAny(article, "set", "tracksuit")) return female ? "women-set-the-thao" : "men-set-the-thao";
            if (containsAny(article, "pant", "short")) return female ? "women-quan-the-thao" : "men-quan-the-thao";
            return female ? "women-ao-the-thao" : "men-ao-the-thao";
        }
        if (containsAny(article, "night", "sleep", "lounge", "pyjama", "pyjamas", "robe", "innerwear", "bra", "brief")) {
            return female ? "women-bo-mac-nha" : "men-bo-mac-nha";
        }
        return "";
    }

    private String mapBySubCategory(String subCategory, String usage, boolean female, boolean male, String masterCategory) {
        String normalizedMaster = normalizedToken(masterCategory);
        if ("accessories".equals(normalizedMaster)) {
            if (containsAny(subCategory, "bags")) return "tui-xach";
            if (containsAny(subCategory, "wallet")) return "vi";
            if (containsAny(subCategory, "belt")) return "that-lung";
            if (containsAny(subCategory, "eyewear")) return "kinh-mat";
            if (containsAny(subCategory, "watches")) return "dong-ho";
            if (containsAny(subCategory, "jewellery", "jewelry")) return "trang-suc";
            if (containsAny(subCategory, "socks")) return "tat";
            if (containsAny(subCategory, "headwear", "caps")) return "non-mu";
        }

        if (containsAny(subCategory, "topwear")) return female ? "women-ao-kieu" : "men-ao-thun";
        if (containsAny(subCategory, "bottomwear")) return female ? "women-quan-jeans" : "men-quan-kaki";
        if (containsAny(subCategory, "dress")) return mapFemaleDressByUsage(usage);
        if (containsAny(subCategory, "innerwear", "sleepwear", "loungewear")) return female ? "women-bo-mac-nha" : "men-bo-mac-nha";
        if (containsAny(subCategory, "sports")) return female ? "women-set-the-thao" : "men-set-the-thao";
        return "";
    }

    private String mapByUsage(String usage, boolean female, boolean male, String masterCategory) {
        String normalizedMaster = normalizedToken(masterCategory);
        if ("accessories".equals(normalizedMaster)) {
            return "tui-xach";
        }
        if (containsAny(usage, "sports")) return female ? "women-ao-the-thao" : "men-ao-the-thao";
        if (containsAny(usage, "party")) return female ? "women-vay-du-tiec" : "men-quan-tay";
        if (containsAny(usage, "formal")) return female ? "women-vay-cong-so" : "men-quan-tay";
        if (containsAny(usage, "home")) return female ? "women-bo-mac-nha" : "men-bo-mac-nha";
        return "";
    }

    private String mapByGender(boolean female, boolean male, String masterCategory) {
        String normalizedMaster = normalizedToken(masterCategory);
        if ("accessories".equals(normalizedMaster)) {
            return "tui-xach";
        }
        if (female) {
            return "women-ao-kieu";
        }
        if (male) {
            return "men-ao-thun";
        }
        return "men-ao-thun";
    }

    private String mapFemaleDressByUsage(String usage) {
        if (containsAny(usage, "party")) return "women-vay-du-tiec";
        if (containsAny(usage, "formal")) return "women-vay-cong-so";
        if (containsAny(usage, "ethnic")) return "women-vay-maxi";
        return "women-vay-lien";
    }

    private String resolveSourceRoot(StyleRow row) {
        String master = normalizedToken(row.masterCategory());
        if ("accessories".equals(master)) {
            return "accessories";
        }
        if (isFemale(row.gender())) {
            return "women";
        }
        return "men";
    }

    private boolean isFemale(String gender) {
        String token = normalizedToken(gender);
        return token.equals("women") || token.equals("girls");
    }

    private boolean isMale(String gender) {
        String token = normalizedToken(gender);
        return token.equals("men") || token.equals("boys");
    }

    private boolean containsAny(String source, String... tokens) {
        if (source == null || source.isBlank()) {
            return false;
        }
        for (String token : tokens) {
            if (source.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private Map<Long, String> loadImageLinks(Path path) throws IOException {
        List<Map<String, String>> rows = readCsv(path);
        Map<Long, String> links = new HashMap<>(rows.size());
        for (Map<String, String> row : rows) {
            long id = parseId(fallbackText(row.get("filename"), row.get("id")));
            if (id <= 0) {
                continue;
            }
            String link = normalizeText(row.get("link"));
            if (!link.isBlank()) {
                links.put(id, link);
            }
        }
        return links;
    }

    private List<StyleRow> loadStyleRows(Path path) throws IOException {
        List<Map<String, String>> rows = readCsv(path);
        List<StyleRow> styles = new ArrayList<>(rows.size());
        for (Map<String, String> row : rows) {
            long id = parseId(row.get("id"));
            if (id <= 0) {
                continue;
            }
            styles.add(new StyleRow(
                    id,
                    normalizeText(row.get("gender")),
                    normalizeText(row.get("masterCategory")),
                    normalizeText(row.get("subCategory")),
                    normalizeText(row.get("articleType")),
                    normalizeText(row.get("baseColour")),
                    normalizeText(row.get("season")),
                    normalizeText(row.get("year")),
                    normalizeText(row.get("usage")),
                    normalizeText(row.get("productDisplayName"))
            ));
        }
        return styles;
    }

    private List<Map<String, String>> readCsv(Path path) throws IOException {
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                return List.of();
            }

            List<String> headers = parseCsvLine(headerLine);
            if (!headers.isEmpty()) {
                headers.set(0, stripBom(headers.get(0)));
            }
            List<Map<String, String>> rows = new ArrayList<>();

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                List<String> columns = parseCsvLine(line);
                Map<String, String> row = new HashMap<>();
                for (int idx = 0; idx < headers.size(); idx++) {
                    String header = headers.get(idx);
                    String value = idx < columns.size() ? columns.get(idx) : "";
                    row.put(header, value);
                }
                rows.add(row);
            }
            return rows;
        }
    }

    private List<String> parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int idx = 0; idx < line.length(); idx++) {
            char ch = line.charAt(idx);
            if (ch == '"') {
                if (inQuotes && idx + 1 < line.length() && line.charAt(idx + 1) == '"') {
                    current.append('"');
                    idx++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }
            if (ch == ',' && !inQuotes) {
                values.add(current.toString());
                current.setLength(0);
                continue;
            }
            current.append(ch);
        }
        values.add(current.toString());
        return values;
    }

    private String stripBom(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        if (value.charAt(0) == '\uFEFF') {
            return value.substring(1);
        }
        return value;
    }

    private Path resolveInputPath(String configuredPath) {
        String raw = normalizeText(configuredPath);
        if (raw.isBlank()) {
            throw new IllegalStateException("CSV path is blank. Please configure app.seed.kaggle paths.");
        }

        Path direct = Path.of(raw);
        List<Path> candidates = new ArrayList<>();
        if (direct.isAbsolute()) {
            candidates.add(direct);
        } else {
            Path cwd = Path.of("").toAbsolutePath().normalize();
            candidates.add(cwd.resolve(direct).normalize());
            candidates.add(cwd.resolve("..").resolve(direct).normalize());
            candidates.add(direct.toAbsolutePath().normalize());
        }

        for (Path candidate : candidates) {
            if (Files.exists(candidate)) {
                return candidate;
            }
        }

        throw new IllegalStateException("CSV file not found: " + raw);
    }

    private long parseId(String raw) {
        String token = normalizeText(raw);
        if (token.isBlank()) {
            return -1L;
        }
        StringBuilder digits = new StringBuilder();
        for (int i = 0; i < token.length(); i++) {
            char ch = token.charAt(i);
            if (Character.isDigit(ch)) {
                digits.append(ch);
            }
        }
        if (digits.isEmpty()) {
            return -1L;
        }
        try {
            return Long.parseLong(digits.toString());
        } catch (NumberFormatException ex) {
            return -1L;
        }
    }

    private String normalizedColor(String color) {
        String normalized = normalizeText(color);
        if (normalized.isBlank() || normalized.equalsIgnoreCase("NA")) {
            return "Mixed";
        }
        return normalized;
    }

    private String normalizedUsage(String usage) {
        String normalized = normalizeText(usage);
        if (normalized.isBlank() || normalized.equalsIgnoreCase("NA")) {
            return "Casual";
        }
        return normalized;
    }

    private String normalizedSeason(String season) {
        String normalized = normalizeText(season);
        if (normalized.isBlank() || normalized.equalsIgnoreCase("NA")) {
            return "All season";
        }
        return normalized;
    }

    private String normalizedToken(String value) {
        return normalizeText(value).toLowerCase(Locale.ROOT);
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }
        return Normalizer.normalize(value, Normalizer.Form.NFC).trim();
    }

    private String fallbackText(String value, String fallback) {
        String normalized = normalizeText(value);
        return normalized.isBlank() ? fallback : normalized;
    }

    private record LeafCategory(UUID id, String slug, UUID parentId, String rootSlug) {}

    private record StyleRow(
            long styleId,
            String gender,
            String masterCategory,
            String subCategory,
            String articleType,
            String baseColour,
            String season,
            String year,
            String usage,
            String productDisplayName
    ) {}

    private record Candidate(StyleRow row, LeafCategory preferredLeaf, String imageUrl) {}

    private record AssignedCandidate(Candidate candidate, LeafCategory assignedLeaf) {}

    private record PricePlan(BigDecimal basePrice, BigDecimal salePrice) {}
}
