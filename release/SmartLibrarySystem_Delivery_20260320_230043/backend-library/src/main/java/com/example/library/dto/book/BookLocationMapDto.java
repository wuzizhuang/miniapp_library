package com.example.library.dto.book;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Generated map payload for a book's physical shelf locations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookLocationMapDto {
    private Integer bookId;
    private String bookTitle;
    private String generatedMode;
    private Integer totalCopies;
    private Integer availableCopies;
    private Integer highlightedFloorPlanId;
    private List<Location> locations;
    private List<Floor> floors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Location {
        private Integer copyId;
        private String locationCode;
        private Integer floorPlanId;
        private Integer floorOrder;
        private String floorName;
        private String zoneCode;
        private String zoneName;
        private String shelfCode;
        private String status;
        private boolean available;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Floor {
        private Integer floorPlanId;
        private Integer floorOrder;
        private String floorName;
        private String summary;
        private Integer mapWidth;
        private Integer mapHeight;
        private Integer highlightedAvailableCopies;
        private List<Zone> zones;
        private List<Shelf> shelves;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Zone {
        private String zoneCode;
        private String zoneName;
        private Integer x;
        private Integer y;
        private Integer width;
        private Integer height;
        private String color;
        private Integer shelfCount;
        private Integer highlightedAvailableCopies;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Shelf {
        private String shelfCode;
        private String label;
        private String zoneCode;
        private String zoneName;
        private Integer x;
        private Integer y;
        private Integer width;
        private Integer height;
        private Integer depth;
        private Integer copyCount;
        private Integer availableCopyCount;
        private boolean highlighted;
        private List<String> locationCodes;
    }
}
