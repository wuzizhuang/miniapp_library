package com.example.library.repository;

import com.example.library.entity.Seat;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Seat repository.
 */
@Repository
public interface SeatRepository extends JpaRepository<Seat, Integer> {

    /**
     * Returns seats for reader browsing.
     */
    @Query("""
            SELECT s
            FROM Seat s
            WHERE (:floorName IS NULL OR LOWER(s.floorName) LIKE LOWER(CONCAT('%', :floorName, '%')))
              AND (:zoneName IS NULL OR LOWER(COALESCE(s.zoneName, '')) LIKE LOWER(CONCAT('%', :zoneName, '%')))
            ORDER BY s.floorOrder ASC, s.zoneName ASC, s.seatCode ASC
            """)
    List<Seat> searchSeats(@Param("floorName") String floorName, @Param("zoneName") String zoneName);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Seat s WHERE s.seatId = :seatId")
    Optional<Seat> findByIdForUpdate(@Param("seatId") Integer seatId);
}
