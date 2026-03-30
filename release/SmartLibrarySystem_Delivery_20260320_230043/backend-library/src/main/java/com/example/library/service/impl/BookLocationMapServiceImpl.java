package com.example.library.service.impl;

import com.example.library.dto.book.BookLocationMapDto;
import com.example.library.entity.Book;
import com.example.library.entity.BookCopy;
import com.example.library.exception.ResourceNotFoundException;
import com.example.library.repository.BookCopyRepository;
import com.example.library.repository.BookRepository;
import com.example.library.service.BookLocationMapService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 图书定位地图服务实现。
 * 根据副本位置码、楼层信息和馆藏模板动态拼装默认馆藏地图。
 */
@Service
@RequiredArgsConstructor
public class BookLocationMapServiceImpl implements BookLocationMapService {

    private static final int MAP_WIDTH = 960;
    private static final int MAP_HEIGHT = 620;
    private static final Pattern FLOOR_PATTERN = Pattern.compile("(\\d{1,2})\\s*(?:F|L|层|楼)", Pattern.CASE_INSENSITIVE);
    private static final Pattern ZONE_PATTERN = Pattern.compile("^([A-Z]{1,3})");
    private static final Pattern SHELF_PATTERN = Pattern.compile("^([A-Z]{1,3})-?([A-Z0-9]{1,8})");
    private static final List<ZoneTemplate> ZONE_TEMPLATES = List.of(
            new ZoneTemplate("A", "综合书库", 72, 116, 180, 190, "#fde68a", 3),
            new ZoneTemplate("B", "文学阅览", 282, 116, 180, 190, "#f9a8d4", 3),
            new ZoneTemplate("C", "科技阅览", 492, 116, 180, 190, "#93c5fd", 3),
            new ZoneTemplate("D", "人文阅览", 702, 116, 180, 190, "#86efac", 3),
            new ZoneTemplate("E", "参考检索", 162, 354, 258, 160, "#fdba74", 4),
            new ZoneTemplate("F", "安静自习", 500, 354, 258, 160, "#a7f3d0", 4)
    );

    private final BookRepository bookRepository;
    private final BookCopyRepository bookCopyRepository;

    @Override
    @Transactional(readOnly = true)
    public BookLocationMapDto getBookLocationMap(Integer bookId) {
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ResourceNotFoundException("Book not found with id: " + bookId));
        List<BookCopy> copies = bookCopyRepository.findByBookBookId(bookId);
        List<ParsedCopyLocation> parsedLocations = copies.stream()
                .map(this::parseCopyLocation)
                .sorted(Comparator
                        .comparing(ParsedCopyLocation::available).reversed()
                        .thenComparing(ParsedCopyLocation::floorOrder)
                        .thenComparing(ParsedCopyLocation::zoneCode)
                .thenComparing(ParsedCopyLocation::shelfCode)
                .thenComparing(ParsedCopyLocation::locationCode))
                .toList();

        // 先按楼层聚合，再把每层拆成区域和书架，确保前端拿到的是稳定的结构化数据。
        Map<Integer, List<ParsedCopyLocation>> copiesByFloor = parsedLocations.stream()
                .collect(Collectors.groupingBy(
                        ParsedCopyLocation::floorPlanId,
                        LinkedHashMap::new,
                        Collectors.toList()));

        List<BookLocationMapDto.Floor> floors = copiesByFloor.entrySet().stream()
                .map(entry -> buildFloor(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(BookLocationMapDto.Floor::getFloorOrder))
                .toList();

        Integer highlightedFloorPlanId = floors.stream()
                .max(Comparator
                        .comparing(BookLocationMapDto.Floor::getHighlightedAvailableCopies)
                        .thenComparing(floor -> -floor.getFloorOrder()))
                .map(BookLocationMapDto.Floor::getFloorPlanId)
                .orElse(1);

        return BookLocationMapDto.builder()
                .bookId(book.getBookId())
                .bookTitle(book.getTitle())
                .generatedMode("DEFAULT_TEMPLATE")
                .totalCopies(copies.size())
                .availableCopies((int) copies.stream().filter(copy -> copy.getStatus() == BookCopy.CopyStatus.AVAILABLE).count())
                .highlightedFloorPlanId(highlightedFloorPlanId)
                .locations(parsedLocations.stream().map(this::toLocationDto).toList())
                .floors(floors)
                .build();
    }

    /**
     * 将解析后的位置信息转换为平铺明细，供前端列表/高亮联动使用。
     */
    private BookLocationMapDto.Location toLocationDto(ParsedCopyLocation parsed) {
        return BookLocationMapDto.Location.builder()
                .copyId(parsed.copyId())
                .locationCode(parsed.locationCode())
                .floorPlanId(parsed.floorPlanId())
                .floorOrder(parsed.floorOrder())
                .floorName(parsed.floorName())
                .zoneCode(parsed.zoneCode())
                .zoneName(parsed.zoneName())
                .shelfCode(parsed.shelfCode())
                .status(parsed.status())
                .available(parsed.available())
                .build();
    }

    /**
     * 生成单层楼的地图结构。
     */
    private BookLocationMapDto.Floor buildFloor(Integer floorPlanId, List<ParsedCopyLocation> copies) {
        int floorOrder = copies.stream().map(ParsedCopyLocation::floorOrder).min(Integer::compareTo).orElse(floorPlanId);
        String floorName = copies.stream().map(ParsedCopyLocation::floorName).filter(Objects::nonNull).findFirst()
                .orElseGet(() -> formatFloorName(floorOrder));

        Map<String, ShelfAggregate> shelvesByCode = new LinkedHashMap<>();
        for (ParsedCopyLocation copy : copies) {
            shelvesByCode.computeIfAbsent(
                    copy.shelfCode(),
                    key -> new ShelfAggregate(copy.shelfCode(), copy.zoneCode(), copy.zoneName()))
                    .add(copy);
        }

        Map<String, List<ShelfAggregate>> shelvesByZone = shelvesByCode.values().stream()
                .sorted(Comparator.comparing(ShelfAggregate::zoneCode).thenComparing(ShelfAggregate::shelfCode))
                .collect(Collectors.groupingBy(
                        ShelfAggregate::zoneCode,
                        LinkedHashMap::new,
                        Collectors.toList()));

        List<ZoneTemplate> zoneTemplates = new ArrayList<>(ZONE_TEMPLATES);
        Set<String> knownZoneCodes = ZONE_TEMPLATES.stream()
                .map(ZoneTemplate::code)
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));
        int extraZoneIndex = 0;
        for (String zoneCode : shelvesByZone.keySet()) {
            if (!knownZoneCodes.contains(zoneCode)) {
                zoneTemplates.add(createDynamicZoneTemplate(zoneCode, extraZoneIndex++));
            }
        }

        List<BookLocationMapDto.Zone> zones = new ArrayList<>();
        List<BookLocationMapDto.Shelf> shelves = new ArrayList<>();

        for (ZoneTemplate template : zoneTemplates) {
            List<ShelfAggregate> zoneShelves = shelvesByZone.getOrDefault(template.code(), List.of());
            zones.add(BookLocationMapDto.Zone.builder()
                    .zoneCode(template.code())
                    .zoneName(template.label())
                    .x(template.x())
                    .y(template.y())
                    .width(template.width())
                    .height(template.height())
                    .color(template.color())
                    .shelfCount(zoneShelves.size())
                    .highlightedAvailableCopies(zoneShelves.stream().mapToInt(ShelfAggregate::availableCopyCount).sum())
                    .build());
            shelves.addAll(layoutShelves(template, zoneShelves));
        }

        int highlightedAvailableCopies = copies.stream().filter(ParsedCopyLocation::available).mapToInt(copy -> 1).sum();

        return BookLocationMapDto.Floor.builder()
                .floorPlanId(floorPlanId)
                .floorOrder(floorOrder)
                .floorName(floorName)
                .summary(buildFloorSummary(copies))
                .mapWidth(MAP_WIDTH)
                .mapHeight(MAP_HEIGHT)
                .highlightedAvailableCopies(highlightedAvailableCopies)
                .zones(zones)
                .shelves(shelves)
                .build();
    }

    /**
     * 在某个区域模板内按网格布局书架。
     */
    private List<BookLocationMapDto.Shelf> layoutShelves(ZoneTemplate template, List<ShelfAggregate> zoneShelves) {
        List<BookLocationMapDto.Shelf> shelves = new ArrayList<>();
        int columns = template.columns();
        int leftPadding = 22;
        int topPadding = 40;
        int shelfWidth = template.width() >= 220 ? 46 : 42;
        int shelfHeight = 28;
        int gapX = 14;
        int gapY = 18;

        for (int index = 0; index < zoneShelves.size(); index++) {
            ShelfAggregate shelf = zoneShelves.get(index);
            int column = index % columns;
            int row = index / columns;
            int x = template.x() + leftPadding + column * (shelfWidth + gapX);
            int y = template.y() + topPadding + row * (shelfHeight + gapY);

            shelves.add(BookLocationMapDto.Shelf.builder()
                    .shelfCode(shelf.shelfCode())
                    .label(shelf.shelfCode())
                    .zoneCode(shelf.zoneCode())
                    .zoneName(shelf.zoneName())
                    .x(x)
                    .y(y)
                    .width(shelfWidth)
                    .height(shelfHeight)
                    .depth(14)
                    .copyCount(shelf.copyCount())
                    .availableCopyCount(shelf.availableCopyCount())
                    .highlighted(shelf.availableCopyCount() > 0)
                    .locationCodes(shelf.locationCodes())
                    .build());
        }

        return shelves;
    }

    /**
     * 生成本层的摘要文案，突出可借副本和覆盖分区。
     */
    private String buildFloorSummary(List<ParsedCopyLocation> copies) {
        long availableCount = copies.stream().filter(ParsedCopyLocation::available).count();
        Set<String> zones = copies.stream()
                .map(ParsedCopyLocation::zoneName)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(java.util.LinkedHashSet::new));
        String zoneText = zones.isEmpty() ? "默认馆藏区" : String.join(" / ", zones);
        return availableCount > 0
                ? "当前楼层可定位 " + availableCount + " 本可借副本，覆盖 " + zoneText
                : "当前楼层仅展示馆藏位置，覆盖 " + zoneText;
    }

    /**
     * 把副本实体解析成地图绘制所需的标准位置信息。
     */
    private ParsedCopyLocation parseCopyLocation(BookCopy copy) {
        String normalizedLocation = normalizeLocationCode(copy.getLocationCode(), copy.getCopyId());
        int floorPlanId = deriveFloorPlanId(copy.getFloorPlanId(), normalizedLocation);
        int floorOrder = floorPlanId;
        String floorName = formatFloorName(floorOrder);
        String zoneCode = deriveZoneCode(normalizedLocation);
        String zoneName = lookupZoneName(zoneCode);
        String shelfCode = deriveShelfCode(normalizedLocation, zoneCode, copy.getCopyId());

        return new ParsedCopyLocation(
                copy.getCopyId(),
                normalizedLocation,
                floorPlanId,
                floorOrder,
                floorName,
                zoneCode,
                zoneName,
                shelfCode,
                copy.getStatus().name(),
                copy.getStatus() == BookCopy.CopyStatus.AVAILABLE);
    }

    /**
     * 优先使用显式楼层平面图 id，缺失时再从位置码中推断楼层。
     */
    private int deriveFloorPlanId(Integer floorPlanId, String locationCode) {
        if (floorPlanId != null && floorPlanId > 0) {
            return floorPlanId;
        }

        Matcher matcher = FLOOR_PATTERN.matcher(locationCode);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }

        return 1;
    }

    /**
     * 从位置码解析区域编码，解析失败时回落到默认 A 区。
     */
    private String deriveZoneCode(String locationCode) {
        String withoutFloor = stripFloorPrefix(locationCode);
        Matcher matcher = ZONE_PATTERN.matcher(withoutFloor);
        if (matcher.find()) {
            return matcher.group(1);
        }

        return "A";
    }

    /**
     * 提取书架编码，缺失时根据副本 id 生成兜底编码，避免地图无法落点。
     */
    private String deriveShelfCode(String locationCode, String zoneCode, Integer copyId) {
        String withoutFloor = stripFloorPrefix(locationCode);
        String canonical = canonicalizeSegments(withoutFloor);
        Matcher matcher = SHELF_PATTERN.matcher(canonical);
        if (matcher.find()) {
            return matcher.group(1) + "-" + matcher.group(2);
        }

        return zoneCode + "-" + String.format(Locale.ROOT, "%02d", copyId % 100);
    }

    /**
     * 标准化位置码，统一大小写与分隔符格式。
     */
    private String normalizeLocationCode(String locationCode, Integer copyId) {
        if (locationCode == null || locationCode.isBlank()) {
            return "1F-A-" + String.format(Locale.ROOT, "%02d", copyId % 100);
        }

        String normalized = locationCode.trim().toUpperCase(Locale.ROOT)
                .replace('（', '(')
                .replace('）', ')')
                .replaceAll("\\s+", "")
                .replaceAll("[_/]+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");

        return normalized.isBlank()
                ? "1F-A-" + String.format(Locale.ROOT, "%02d", copyId % 100)
                : normalized;
    }

    private String stripFloorPrefix(String locationCode) {
        return locationCode.replaceFirst("^(\\d{1,2})\\s*(?:F|L|层|楼)[-_/ ]*", "");
    }

    private String canonicalizeSegments(String locationCode) {
        return locationCode
                .replaceAll("[^A-Z0-9]+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");
    }

    private String formatFloorName(int floorOrder) {
        return floorOrder + "F";
    }

    private String lookupZoneName(String zoneCode) {
        return ZONE_TEMPLATES.stream()
                .filter(template -> template.code().equals(zoneCode))
                .map(ZoneTemplate::label)
                .findFirst()
                .orElse("默认馆藏区");
    }

    /**
     * 当遇到模板外的新区域时，动态生成一个额外区域块，避免前端丢失位置数据。
     */
    private ZoneTemplate createDynamicZoneTemplate(String zoneCode, int index) {
        int baseX = 72 + (index % 3) * 210;
        int baseY = 354 + (index / 3) * 178;
        String[] palette = { "#c4b5fd", "#fca5a5", "#67e8f9", "#bef264" };
        return new ZoneTemplate(
                zoneCode,
                zoneCode + " 区",
                baseX,
                baseY,
                180,
                150,
                palette[index % palette.length],
                3);
    }

    private record ParsedCopyLocation(
            Integer copyId,
            String locationCode,
            Integer floorPlanId,
            Integer floorOrder,
            String floorName,
            String zoneCode,
            String zoneName,
            String shelfCode,
            String status,
            boolean available) {
    }

    private record ZoneTemplate(
            String code,
            String label,
            int x,
            int y,
            int width,
            int height,
            String color,
            int columns) {
    }

    private static final class ShelfAggregate {
        private final String shelfCode;
        private final String zoneCode;
        private final String zoneName;
        private final List<String> locationCodes = new ArrayList<>();
        private int copyCount;
        private int availableCopyCount;

        private ShelfAggregate(String shelfCode, String zoneCode, String zoneName) {
            this.shelfCode = shelfCode;
            this.zoneCode = zoneCode;
            this.zoneName = zoneName;
        }

        /**
         * 归并同一书架上的副本数量和可借数量。
         */
        private void add(ParsedCopyLocation copy) {
            copyCount += 1;
            if (copy.available()) {
                availableCopyCount += 1;
            }
            if (!locationCodes.contains(copy.locationCode())) {
                locationCodes.add(copy.locationCode());
            }
        }

        private String shelfCode() {
            return shelfCode;
        }

        private String zoneCode() {
            return zoneCode;
        }

        private String zoneName() {
            return zoneName;
        }

        private int copyCount() {
            return copyCount;
        }

        private int availableCopyCount() {
            return availableCopyCount;
        }

        private List<String> locationCodes() {
            return locationCodes;
        }
    }
}
