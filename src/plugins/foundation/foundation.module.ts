import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Address } from './entities/address.entity';
import { AgeBand } from './entities/age-band.entity';
import { AuditLog } from './entities/audit-log.entity';
import { BenefitCatalog } from './entities/benefit-catalog.entity';
import { BenefitCatalogItem } from './entities/benefit-catalog-item.entity';
import { BenefitLevel } from './entities/benefit-level.entity';
import { DiscountProgram } from './entities/discount-program.entity';
import { GeoState } from './entities/geo-state.entity';
import { GuidelineDocument } from './entities/guideline-document.entity';
import { GuidelineVersion } from './entities/guideline-version.entity';
import { GuidelineAcceptance } from './entities/guideline-acceptance.entity';
import { KYC } from './entities/kyc.entity';
import { OutboxEventConsumer } from './entities/outbox-event-consumer.entity';
import { ResourceRef } from './entities/resource-ref.entity';
import { SmokProfile } from './entities/smoker-profile.entity';
import { AddressRepository } from './repositories/address.repo';
import { AgeBandRepository } from './repositories/age-band.repo';
import { AuditLogRepository } from './repositories/audit-log.repo';
import { BenefitCatalogRepository } from './repositories/benefit-catalog.repo';
import { BenefitCatalogItemRepository } from './repositories/benefit-catalog-item.repo';
import { BenefitLevelRepository } from './repositories/benefit-level.repo';
import { DiscountProgramRepository } from './repositories/discount-program.repo';
import { GeoStateRepository } from './repositories/geo-state.repo';
import { GuidelineDocumentRepository } from './repositories/guideline-document.repo';
import { GuidelineVersionRepository } from './repositories/guideline-version.repo';
import { GuidelineAcceptanceRepository } from './repositories/guideline-acceptance.repo';
import { KYCRepository } from './repositories/kyc.repo';
import { OutboxEventConsumerRepository } from './repositories/outbox-event-consumer.repo';
import { ResourceRefRepository } from './repositories/resource-ref.repo';
import { SmokProfileRepository } from './repositories/smoker-profile.repo';
import { FoundationWorkflowService } from './services/foundation.workflow.service';
import { ReferenceDataController } from './controllers/reference-data.controller';
import { AddressController } from './controllers/address.controller';
import { BenefitCatalogController } from './controllers/benefit-catalog.controller';
import { DiscountProgramController } from './controllers/discount-program.controller';
import { GuidelineController } from './controllers/guideline.controller';
import { KYCController } from './controllers/kyc.controller';

/**
 * FoundationModule
 * Provides shared/support tables: reference data, addresses, benefit catalogs,
 * discount programs, guidelines, KYC, audit logs, and resource refs.
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Address,
      AgeBand,
      AuditLog,
      BenefitCatalog,
      BenefitCatalogItem,
      BenefitLevel,
      DiscountProgram,
      GeoState,
      GuidelineDocument,
      GuidelineVersion,
      GuidelineAcceptance,
      KYC,
      OutboxEventConsumer,
      ResourceRef,
      SmokProfile,
    ]),
  ],
  providers: [
    AddressRepository,
    AgeBandRepository,
    AuditLogRepository,
    BenefitCatalogRepository,
    BenefitCatalogItemRepository,
    BenefitLevelRepository,
    DiscountProgramRepository,
    GeoStateRepository,
    GuidelineDocumentRepository,
    GuidelineVersionRepository,
    GuidelineAcceptanceRepository,
    KYCRepository,
    OutboxEventConsumerRepository,
    ResourceRefRepository,
    SmokProfileRepository,
    FoundationWorkflowService,
  ],
  controllers: [
    ReferenceDataController,
    AddressController,
    BenefitCatalogController,
    DiscountProgramController,
    GuidelineController,
    KYCController,
  ],
  exports: [FoundationWorkflowService],
})
export class FoundationModule {}
