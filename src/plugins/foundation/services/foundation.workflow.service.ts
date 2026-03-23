import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { AddressRepository } from '../repositories/address.repo';
import { AgeBandRepository } from '../repositories/age-band.repo';
import { AuditLogRepository } from '../repositories/audit-log.repo';
import { BenefitCatalogRepository } from '../repositories/benefit-catalog.repo';
import { BenefitCatalogItemRepository } from '../repositories/benefit-catalog-item.repo';
import { BenefitLevelRepository } from '../repositories/benefit-level.repo';
import { DiscountProgramRepository } from '../repositories/discount-program.repo';
import { GeoStateRepository } from '../repositories/geo-state.repo';
import { GuidelineDocumentRepository } from '../repositories/guideline-document.repo';
import { GuidelineVersionRepository } from '../repositories/guideline-version.repo';
import { GuidelineAcceptanceRepository } from '../repositories/guideline-acceptance.repo';
import { KYCRepository } from '../repositories/kyc.repo';
import { ResourceRefRepository } from '../repositories/resource-ref.repo';
import { SmokProfileRepository } from '../repositories/smoker-profile.repo';
import { AgeBandUpsertDto } from '../dtos/age-band-upsert.dto';
import { SmokProfileUpsertDto } from '../dtos/smok-profile-upsert.dto';
import { GeoStateUpsertDto } from '../dtos/geo-state-upsert.dto';
import { AddressAddDto } from '../dtos/address-add.dto';
import { BenefitCatalogCreateDto } from '../dtos/benefit-catalog-create.dto';
import { BenefitCatalogItemCreateDto } from '../dtos/benefit-catalog-item-create.dto';
import { BenefitLevelCreateDto } from '../dtos/benefit-level-create.dto';
import { DiscountProgramCreateDto } from '../dtos/discount-program-create.dto';
import { GuidelineDocumentCreateDto } from '../dtos/guideline-document-create.dto';
import { GuidelineVersionCreateDto } from '../dtos/guideline-version-create.dto';
import { GuidelineAcceptDto } from '../dtos/guideline-accept.dto';
import { KYCUpsertDto } from '../dtos/kyc-upsert.dto';
import { ResourceRefRegisterDto } from '../dtos/resource-ref-register.dto';
import type { Actor } from '../../../corekit/types/actor.type';
import { v4 as uuidv4 } from 'uuid';

/**
 * FoundationWorkflowService
 * Implements all Foundation pillar commands following the workflow discipline:
 * Guard → Write → Emit → Commit
 *
 * Based on specs/foundation/foundation.pillar.v2.yml
 */
@Injectable()
export class FoundationWorkflowService {
  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly addressRepo: AddressRepository,
    private readonly ageBandRepo: AgeBandRepository,
    private readonly auditLogRepo: AuditLogRepository,
    private readonly benefitCatalogRepo: BenefitCatalogRepository,
    private readonly benefitCatalogItemRepo: BenefitCatalogItemRepository,
    private readonly benefitLevelRepo: BenefitLevelRepository,
    private readonly discountProgramRepo: DiscountProgramRepository,
    private readonly geoStateRepo: GeoStateRepository,
    private readonly guidelineDocumentRepo: GuidelineDocumentRepository,
    private readonly guidelineVersionRepo: GuidelineVersionRepository,
    private readonly guidelineAcceptanceRepo: GuidelineAcceptanceRepository,
    private readonly kycRepo: KYCRepository,
    private readonly resourceRefRepo: ResourceRefRepository,
    private readonly smokProfileRepo: SmokProfileRepository,
  ) {}

  // -------------------------------------------------------
  // REFERENCE DATA
  // -------------------------------------------------------

  /**
   * AgeBand.Upsert
   * POST /api/v1/foundation/age-bands
   */
  async upsertAgeBand(dto: AgeBandUpsertDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const id = await this.ageBandRepo.upsert(
        {
          code: dto.code,
          min_age: dto.min_age,
          max_age: dto.max_age,
          age_factor: dto.age_factor ?? '1.000',
        },
        queryRunner,
      );
      return this.ageBandRepo.findById(id, queryRunner);
    });
  }

  /**
   * SmokProfile.Upsert
   * POST /api/v1/foundation/smoker-profiles
   */
  async upsertSmokProfile(dto: SmokProfileUpsertDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const id = await this.smokProfileRepo.upsert(
        {
          code: dto.code,
          smoker_factor: dto.smoker_factor ?? '1.000',
          loading_pct: dto.loading_pct ?? '0.000',
        },
        queryRunner,
      );
      return this.smokProfileRepo.findById(id, queryRunner);
    });
  }

  /**
   * GeoState.Upsert
   * POST /api/v1/foundation/geo-states
   */
  async upsertGeoState(dto: GeoStateUpsertDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const id = await this.geoStateRepo.upsert(
        {
          country_code: dto.country_code,
          state_code: dto.state_code,
          name: dto.name,
          status: dto.status ?? 'active',
        },
        queryRunner,
      );
      return this.geoStateRepo.findById(id, queryRunner);
    });
  }

  // -------------------------------------------------------
  // ADDRESS
  // -------------------------------------------------------

  /**
   * Address.AddToOwner
   * POST /api/v1/foundation/addresses
   */
  async addAddress(dto: AddressAddDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // If is_default, clear existing default for owner
      if (dto.is_default) {
        await this.addressRepo.clearDefault(dto.owner_type, dto.owner_id, queryRunner);
      }

      const id = await this.addressRepo.create(
        {
          owner_type: dto.owner_type,
          owner_id: dto.owner_id,
          type: dto.type ?? null,
          line1: dto.line1 ?? null,
          line2: dto.line2 ?? null,
          city: dto.city ?? null,
          state_code: dto.state_code ?? null,
          postcode: dto.postcode ?? null,
          country: dto.country ?? null,
          is_default: dto.is_default ? 1 : 0,
        },
        queryRunner,
      );
      return this.addressRepo.findById(id, queryRunner);
    });
  }

  /**
   * Address.SetDefault
   * POST /api/v1/foundation/addresses/:addressId/set-default
   */
  async setDefaultAddress(addressId: number, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const address = await this.addressRepo.findById(addressId, queryRunner);
      if (!address) {
        throw new NotFoundException({ code: 'ADDRESS_NOT_FOUND', message: `Address ${addressId} not found` });
      }

      // WRITE: clear existing default then set this one
      await this.addressRepo.clearDefault(address.owner_type, address.owner_id, queryRunner);
      await this.addressRepo.update(addressId, { is_default: 1 }, queryRunner);

      return this.addressRepo.findById(addressId, queryRunner);
    });
  }

  // -------------------------------------------------------
  // BENEFIT CATALOG
  // -------------------------------------------------------

  /**
   * BenefitCatalog.Create
   * POST /api/v1/foundation/benefit-catalogs
   */
  async createBenefitCatalog(dto: BenefitCatalogCreateDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const existing = await this.benefitCatalogRepo.findByCodeAndVersion(dto.code, dto.version ?? 'v1', queryRunner);
      if (existing) {
        throw new ConflictException({ code: 'BENEFIT_CATALOG_ALREADY_EXISTS', message: `Benefit catalog ${dto.code}@${dto.version ?? 'v1'} already exists` });
      }

      // WRITE
      const id = await this.benefitCatalogRepo.create(
        {
          code: dto.code,
          name: dto.name,
          status: 'active',
          version: dto.version ?? 'v1',
          effective_from: dto.effective_from ? new Date(dto.effective_from) : null,
          effective_to: dto.effective_to ? new Date(dto.effective_to) : null,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      // EMIT
      await this.outboxService.enqueue(
        {
          event_name: 'BENEFIT_CATALOG_CREATED',
          event_version: 1,
          aggregate_type: 'BENEFIT_CATALOG',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: { catalog_id: id, code: dto.code, version: dto.version ?? 'v1' },
        },
        queryRunner,
      );

      return this.benefitCatalogRepo.findById(id, queryRunner);
    });
  }

  /**
   * BenefitCatalog.Archive
   * POST /api/v1/foundation/benefit-catalogs/:catalogId/archive
   */
  async archiveBenefitCatalog(catalogId: number, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const catalog = await this.benefitCatalogRepo.findById(catalogId, queryRunner);
      if (!catalog) {
        throw new NotFoundException({ code: 'BENEFIT_CATALOG_NOT_FOUND', message: `Benefit catalog ${catalogId} not found` });
      }
      if (catalog.status === 'archived') {
        throw new BadRequestException({ code: 'BENEFIT_CATALOG_ALREADY_ARCHIVED', message: `Benefit catalog ${catalogId} is already archived` });
      }

      // WRITE
      await this.benefitCatalogRepo.update(catalogId, { status: 'archived' }, queryRunner);

      // EMIT
      await this.outboxService.enqueue(
        {
          event_name: 'BENEFIT_CATALOG_ARCHIVED',
          event_version: 1,
          aggregate_type: 'BENEFIT_CATALOG',
          aggregate_id: String(catalogId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: { catalog_id: catalogId },
        },
        queryRunner,
      );

      return this.benefitCatalogRepo.findById(catalogId, queryRunner);
    });
  }

  /**
   * BenefitCatalogItem.Create
   * POST /api/v1/foundation/benefit-catalogs/:catalogId/items
   */
  async createBenefitCatalogItem(catalogId: number, dto: BenefitCatalogItemCreateDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const catalog = await this.benefitCatalogRepo.findById(catalogId, queryRunner);
      if (!catalog) {
        throw new NotFoundException({ code: 'BENEFIT_CATALOG_NOT_FOUND', message: `Benefit catalog ${catalogId} not found` });
      }
      if (catalog.status === 'archived') {
        throw new BadRequestException({ code: 'BENEFIT_CATALOG_ARCHIVED', message: `Cannot add items to archived catalog ${catalogId}` });
      }
      const existingItem = await this.benefitCatalogItemRepo.findByCatalogAndCode(catalogId, dto.item_code, queryRunner);
      if (existingItem) {
        throw new ConflictException({ code: 'BENEFIT_ITEM_ALREADY_EXISTS', message: `Item ${dto.item_code} already exists in catalog ${catalogId}` });
      }

      // WRITE
      const id = await this.benefitCatalogItemRepo.create(
        {
          catalog_id: catalogId,
          item_code: dto.item_code,
          name: dto.name,
          category: dto.category ?? 'other',
          limit_type: dto.limit_type ?? 'per_year',
          limit_amount: dto.limit_amount ?? '0.00',
          limit_count: dto.limit_count ?? 0,
          eligibility_rule_version: dto.eligibility_rule_version ?? null,
          eligibility_rule_json: dto.eligibility_rule_json ?? null,
          calculation_mode: dto.calculation_mode ?? 'reimburse',
          percent_value: dto.percent_value ?? null,
          fixed_amount: dto.fixed_amount ?? null,
          status: 'active',
        },
        queryRunner,
      );

      return this.benefitCatalogItemRepo.findById(id, queryRunner);
    });
  }

  /**
   * BenefitLevel.Create
   * POST /api/v1/foundation/benefit-catalogs/:catalogId/levels
   */
  async createBenefitLevel(catalogId: number, dto: BenefitLevelCreateDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const catalog = await this.benefitCatalogRepo.findById(catalogId, queryRunner);
      if (!catalog) {
        throw new NotFoundException({ code: 'BENEFIT_CATALOG_NOT_FOUND', message: `Benefit catalog ${catalogId} not found` });
      }
      const existingLevel = await this.benefitLevelRepo.findByCatalogAndCode(catalogId, dto.level_code, queryRunner);
      if (existingLevel) {
        throw new ConflictException({ code: 'BENEFIT_LEVEL_ALREADY_EXISTS', message: `Level ${dto.level_code} already exists in catalog ${catalogId}` });
      }

      // WRITE
      const id = await this.benefitLevelRepo.create(
        {
          catalog_id: catalogId,
          level_code: dto.level_code,
          level_name: dto.level_name,
          sort_order: dto.sort_order ?? 0,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      return this.benefitLevelRepo.findById(id, queryRunner);
    });
  }

  // -------------------------------------------------------
  // DISCOUNT PROGRAM
  // -------------------------------------------------------

  /**
   * DiscountProgram.Create
   * POST /api/v1/foundation/discount-programs
   */
  async createDiscountProgram(dto: DiscountProgramCreateDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const existing = await this.discountProgramRepo.findByCode(dto.code, queryRunner);
      if (existing) {
        throw new ConflictException({ code: 'DISCOUNT_PROGRAM_ALREADY_EXISTS', message: `Discount program ${dto.code} already exists` });
      }

      // WRITE
      const id = await this.discountProgramRepo.create(
        {
          code: dto.code,
          discount_type: dto.discount_type,
          value: dto.value,
          eligibility_rule_version: dto.eligibility_rule_version ?? null,
          rule_json: dto.rule_json ?? null,
          starts_at: dto.starts_at ? new Date(dto.starts_at) : null,
          ends_at: dto.ends_at ? new Date(dto.ends_at) : null,
          status: 'active',
        },
        queryRunner,
      );

      // EMIT
      await this.outboxService.enqueue(
        {
          event_name: 'DISCOUNT_PROGRAM_CREATED',
          event_version: 1,
          aggregate_type: 'DISCOUNT_PROGRAM',
          aggregate_id: String(id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: { program_id: id, code: dto.code, discount_type: dto.discount_type },
        },
        queryRunner,
      );

      return this.discountProgramRepo.findById(id, queryRunner);
    });
  }

  /**
   * DiscountProgram.Deactivate
   * POST /api/v1/foundation/discount-programs/:programId/deactivate
   */
  async deactivateDiscountProgram(programId: number, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const program = await this.discountProgramRepo.findById(programId, queryRunner);
      if (!program) {
        throw new NotFoundException({ code: 'DISCOUNT_PROGRAM_NOT_FOUND', message: `Discount program ${programId} not found` });
      }
      if (program.status === 'inactive') {
        throw new BadRequestException({ code: 'DISCOUNT_PROGRAM_ALREADY_INACTIVE', message: `Discount program ${programId} is already inactive` });
      }

      // WRITE
      await this.discountProgramRepo.update(programId, { status: 'inactive' }, queryRunner);

      // EMIT
      await this.outboxService.enqueue(
        {
          event_name: 'DISCOUNT_PROGRAM_DEACTIVATED',
          event_version: 1,
          aggregate_type: 'DISCOUNT_PROGRAM',
          aggregate_id: String(programId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: { program_id: programId },
        },
        queryRunner,
      );

      return this.discountProgramRepo.findById(programId, queryRunner);
    });
  }

  // -------------------------------------------------------
  // GUIDELINES
  // -------------------------------------------------------

  /**
   * GuidelineDocument.Create
   * POST /api/v1/foundation/guideline-documents
   */
  async createGuidelineDocument(dto: GuidelineDocumentCreateDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const existing = await this.guidelineDocumentRepo.findByCode(dto.code, queryRunner);
      if (existing) {
        throw new ConflictException({ code: 'GUIDELINE_DOCUMENT_ALREADY_EXISTS', message: `Guideline document ${dto.code} already exists` });
      }

      // WRITE
      const id = await this.guidelineDocumentRepo.create(
        {
          code: dto.code,
          name: dto.name,
          status: 'active',
          scope_type: dto.scope_type ?? 'global',
          scope_ref_type: dto.scope_ref_type ?? null,
          scope_ref_id: dto.scope_ref_id ?? null,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      return this.guidelineDocumentRepo.findById(id, queryRunner);
    });
  }

  /**
   * GuidelineVersion.Create
   * POST /api/v1/foundation/guideline-documents/:documentId/versions
   */
  async createGuidelineVersion(documentId: number, dto: GuidelineVersionCreateDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const document = await this.guidelineDocumentRepo.findById(documentId, queryRunner);
      if (!document) {
        throw new NotFoundException({ code: 'GUIDELINE_DOCUMENT_NOT_FOUND', message: `Guideline document ${documentId} not found` });
      }
      const existing = await this.guidelineVersionRepo.findByDocumentVersionLocale(documentId, dto.version_code, dto.locale ?? 'en', queryRunner);
      if (existing) {
        throw new ConflictException({ code: 'GUIDELINE_VERSION_ALREADY_EXISTS', message: `Version ${dto.version_code}/${dto.locale ?? 'en'} already exists for document ${documentId}` });
      }

      // WRITE
      const id = await this.guidelineVersionRepo.create(
        {
          document_id: documentId,
          version_code: dto.version_code,
          locale: dto.locale ?? 'en',
          status: 'draft',
          content_type: dto.content_type ?? 'html',
          content_text: dto.content_text ?? null,
          content_url: dto.content_url ?? null,
          file_ref_type: dto.file_ref_type ?? null,
          file_ref_id: dto.file_ref_id ?? null,
          effective_from: dto.effective_from ? new Date(dto.effective_from) : null,
          effective_to: dto.effective_to ? new Date(dto.effective_to) : null,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      return this.guidelineVersionRepo.findById(id, queryRunner);
    });
  }

  /**
   * GuidelineVersion.Publish
   * POST /api/v1/foundation/guideline-versions/:versionId/publish
   */
  async publishGuidelineVersion(versionId: number, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const version = await this.guidelineVersionRepo.findById(versionId, queryRunner);
      if (!version) {
        throw new NotFoundException({ code: 'GUIDELINE_VERSION_NOT_FOUND', message: `Guideline version ${versionId} not found` });
      }
      if (version.status !== 'draft') {
        throw new BadRequestException({ code: 'GUIDELINE_VERSION_NOT_DRAFT', message: `Guideline version ${versionId} is not in draft status` });
      }

      // WRITE
      await this.guidelineVersionRepo.update(versionId, { status: 'published' }, queryRunner);

      // EMIT
      await this.outboxService.enqueue(
        {
          event_name: 'GUIDELINE_VERSION_PUBLISHED',
          event_version: 1,
          aggregate_type: 'GUIDELINE_VERSION',
          aggregate_id: String(versionId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: { version_id: versionId, document_id: version.document_id },
        },
        queryRunner,
      );

      return this.guidelineVersionRepo.findById(versionId, queryRunner);
    });
  }

  /**
   * GuidelineVersion.Archive
   * POST /api/v1/foundation/guideline-versions/:versionId/archive
   */
  async archiveGuidelineVersion(versionId: number, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const version = await this.guidelineVersionRepo.findById(versionId, queryRunner);
      if (!version) {
        throw new NotFoundException({ code: 'GUIDELINE_VERSION_NOT_FOUND', message: `Guideline version ${versionId} not found` });
      }
      if (version.status === 'archived') {
        throw new BadRequestException({ code: 'GUIDELINE_VERSION_ALREADY_ARCHIVED', message: `Guideline version ${versionId} is already archived` });
      }

      // WRITE
      await this.guidelineVersionRepo.update(versionId, { status: 'archived' }, queryRunner);

      // EMIT
      await this.outboxService.enqueue(
        {
          event_name: 'GUIDELINE_VERSION_ARCHIVED',
          event_version: 1,
          aggregate_type: 'GUIDELINE_VERSION',
          aggregate_id: String(versionId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: { version_id: versionId, document_id: version.document_id },
        },
        queryRunner,
      );

      return this.guidelineVersionRepo.findById(versionId, queryRunner);
    });
  }

  /**
   * Guideline.Accept
   * POST /api/v1/foundation/guideline-versions/:versionId/accept
   */
  async acceptGuideline(dto: GuidelineAcceptDto, idempotencyKey: string, actor: Actor, requestId?: string, ip?: string, userAgent?: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD: check idempotency — return early if already accepted
      const existingByKey = await this.guidelineAcceptanceRepo.findByIdempotencyKey(idempotencyKey, queryRunner);
      if (existingByKey) {
        return existingByKey;
      }

      const version = await this.guidelineVersionRepo.findById(dto.version_id, queryRunner);
      if (!version) {
        throw new NotFoundException({ code: 'GUIDELINE_VERSION_NOT_FOUND', message: `Guideline version ${dto.version_id} not found` });
      }
      if (version.status !== 'published') {
        throw new BadRequestException({ code: 'GUIDELINE_VERSION_NOT_PUBLISHED', message: `Guideline version ${dto.version_id} is not published` });
      }

      // WRITE
      const id = await this.guidelineAcceptanceRepo.create(
        {
          version_id: dto.version_id,
          account_id: dto.account_id ?? null,
          person_id: dto.person_id ?? null,
          user_id: dto.user_id ?? null,
          acceptance_status: dto.acceptance_status ?? 'accepted',
          channel: dto.channel ?? 'app',
          source: dto.source ?? 'other',
          request_id: requestId ?? null,
          idempotency_key: idempotencyKey,
          ip: ip ?? dto.ip ?? null,
          user_agent: userAgent ?? dto.user_agent ?? null,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );

      // EMIT
      await this.outboxService.enqueue(
        {
          event_name: 'GUIDELINE_ACCEPTED',
          event_version: 1,
          aggregate_type: 'GUIDELINE_VERSION',
          aggregate_id: String(dto.version_id),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: {
            acceptance_id: id,
            version_id: dto.version_id,
            account_id: dto.account_id ?? null,
            person_id: dto.person_id ?? null,
            user_id: dto.user_id ?? null,
            acceptance_status: dto.acceptance_status ?? 'accepted',
            channel: dto.channel ?? 'app',
            source: dto.source ?? 'other',
          },
        },
        queryRunner,
      );

      return this.guidelineAcceptanceRepo.findById(id, queryRunner);
    });
  }

  // -------------------------------------------------------
  // KYC
  // -------------------------------------------------------

  /**
   * KYC.Upsert
   * POST /api/v1/foundation/kyc
   */
  async upsertKYC(dto: KYCUpsertDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const id = await this.kycRepo.create(
        {
          subject_type: dto.subject_type,
          subject_id: dto.subject_id,
          provider: dto.provider ?? null,
          status: dto.status,
          meta_json: dto.meta_json ?? null,
        },
        queryRunner,
      );
      return this.kycRepo.findById(id, queryRunner);
    });
  }

  /**
   * KYC.Verify
   * POST /api/v1/foundation/kyc/:kycId/verify
   */
  async verifyKYC(kycId: number, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const kyc = await this.kycRepo.findById(kycId, queryRunner);
      if (!kyc) {
        throw new NotFoundException({ code: 'KYC_NOT_FOUND', message: `KYC record ${kycId} not found` });
      }
      if (kyc.status === 'verified') {
        throw new BadRequestException({ code: 'KYC_ALREADY_VERIFIED', message: `KYC record ${kycId} is already verified` });
      }

      // WRITE
      await this.kycRepo.update(kycId, { status: 'verified', verified_at: new Date() }, queryRunner);

      // EMIT
      await this.outboxService.enqueue(
        {
          event_name: 'KYC_VERIFIED',
          event_version: 1,
          aggregate_type: 'KYC',
          aggregate_id: String(kycId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: { kyc_id: kycId, subject_type: kyc.subject_type, subject_id: kyc.subject_id, provider: kyc.provider },
        },
        queryRunner,
      );

      return this.kycRepo.findById(kycId, queryRunner);
    });
  }

  /**
   * KYC.Reject
   * POST /api/v1/foundation/kyc/:kycId/reject
   */
  async rejectKYC(kycId: number, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      // GUARD
      const kyc = await this.kycRepo.findById(kycId, queryRunner);
      if (!kyc) {
        throw new NotFoundException({ code: 'KYC_NOT_FOUND', message: `KYC record ${kycId} not found` });
      }
      if (kyc.status === 'rejected') {
        throw new BadRequestException({ code: 'KYC_ALREADY_REJECTED', message: `KYC record ${kycId} is already rejected` });
      }

      // WRITE
      await this.kycRepo.update(kycId, { status: 'rejected' }, queryRunner);

      // EMIT
      await this.outboxService.enqueue(
        {
          event_name: 'KYC_REJECTED',
          event_version: 1,
          aggregate_type: 'KYC',
          aggregate_id: String(kycId),
          actor_user_id: actor.actor_user_id,
          occurred_at: new Date(),
          correlation_id: idempotencyKey,
          causation_id: idempotencyKey,
          payload: { kyc_id: kycId, subject_type: kyc.subject_type, subject_id: kyc.subject_id },
        },
        queryRunner,
      );

      return this.kycRepo.findById(kycId, queryRunner);
    });
  }

  // -------------------------------------------------------
  // AUDIT LOG
  // -------------------------------------------------------

  /**
   * AuditLog.Record
   * POST /api/v1/foundation/audit-logs
   */
  async recordAuditLog(
    actorType: string,
    actorId: string | null,
    action: string,
    resourceType: string,
    resourceId: string | null,
    result: string,
    requestId?: string,
    ip?: string,
    userAgent?: string,
    beforeJson?: any,
    afterJson?: any,
    metaJson?: any,
  ) {
    return this.txService.run(async (queryRunner) => {
      const id = await this.auditLogRepo.create(
        {
          actor_type: actorType,
          actor_id: actorId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          request_id: requestId ?? null,
          ip: ip ?? null,
          user_agent: userAgent ?? null,
          result,
          before_json: beforeJson ?? null,
          after_json: afterJson ?? null,
          meta_json: metaJson ?? null,
          occurred_at: new Date(),
        },
        queryRunner,
      );
      return this.auditLogRepo.findById(id, queryRunner);
    });
  }

  // -------------------------------------------------------
  // RESOURCE REF
  // -------------------------------------------------------

  /**
   * ResourceRef.Register
   * POST /api/v1/foundation/resource-refs
   */
  async registerResourceRef(dto: ResourceRefRegisterDto, actor: Actor, idempotencyKey: string) {
    return this.txService.run(async (queryRunner) => {
      const id = await this.resourceRefRepo.upsert(
        {
          resource_type: dto.resource_type,
          resource_id: dto.resource_id,
          resource_uuid: dto.resource_uuid ?? uuidv4(),
          status: 'active',
        },
        queryRunner,
      );
      return this.resourceRefRepo.findById(id, queryRunner);
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // M3: IC PRE-CHECK (KYC)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * KYC.CheckIC
   * POST /api/v1/foundation/kyc/check-ic
   *
   * Pre-check if an IC/NRIC is already registered in the system.
   * Cross-queries person_identity + person via raw SQL (read-only, no transaction needed).
   *
   * Returns:
   *   eligible: true  → IC is clear; safe to proceed with registration
   *   eligible: false → IC already exists with a blocking status
   */
  async checkIC(icNo: string, idType: string = 'NRIC') {
    const rows = await this.txService.run(async (queryRunner) => {
      return queryRunner.manager.query(
        `SELECT
           pi.id         AS identity_id,
           pi.person_id,
           pi.id_type,
           pi.id_no,
           p.status      AS person_status
         FROM person_identity pi
         JOIN person p ON p.id = pi.person_id
         WHERE pi.id_no = ?
           AND pi.id_type = ?
         LIMIT 1`,
        [icNo, idType],
      );
    });

    if (!rows || rows.length === 0) {
      return {
        eligible: true,
        ic_status: 'clear',
        message: 'IC not found — safe to proceed with registration',
      };
    }

    const row = rows[0];
    const blockingStatuses = ['active', 'probation', 'frozen', 'suspended', 'pending'];
    const eligible = !blockingStatuses.includes(row.person_status);

    return {
      eligible,
      ic_status: eligible ? 'closed_or_terminated' : 'duplicate',
      person_id: row.person_id,
      person_status: row.person_status,
      message: eligible
        ? 'IC exists but person is closed/terminated — may be eligible to rejoin'
        : 'IC already registered with an active person record',
    };
  }
}
