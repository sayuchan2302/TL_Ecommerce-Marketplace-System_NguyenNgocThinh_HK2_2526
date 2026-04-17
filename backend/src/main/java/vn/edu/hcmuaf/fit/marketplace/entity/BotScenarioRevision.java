package vn.edu.hcmuaf.fit.marketplace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "bot_scenario_revisions", indexes = {
        @Index(name = "idx_bot_scenario_status_version", columnList = "scenario_status,revision_number"),
        @Index(name = "idx_bot_scenario_created_at", columnList = "created_at")
})
public class BotScenarioRevision extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "scenario_status", nullable = false, length = 20)
    private ScenarioStatus status;

    @Column(name = "revision_number", nullable = false)
    private Integer revisionNumber;

    @Column(name = "payload_json", nullable = false, columnDefinition = "text")
    private String payloadJson;

    @Column(name = "updated_by")
    private String updatedBy;

    public enum ScenarioStatus {
        DRAFT,
        PUBLISHED
    }
}

