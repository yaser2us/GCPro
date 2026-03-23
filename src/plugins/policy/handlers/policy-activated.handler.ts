import { Injectable, Logger } from '@nestjs/common';
import { TransactionService } from '../../../corekit/services/transaction.service';
import { OutboxService } from '../../../corekit/services/outbox.service';
import { PolicyBenefitEntitlementRepository } from '../repositories/policy-benefit-entitlement.repo';
import { PolicyBenefitUsageRepository } from '../repositories/policy-benefit-usage.repo';

/**
 * PolicyActivatedHandler — M5
 *
 * Listens to POLICY_ACTIVATED events.
 * On activation: ensures benefit entitlement exists and initialises
 * policy_benefit_usage rows (one per benefit item) for the current period.
 *
 * Idempotency:
 * - Checks for existing active entitlement before creating
 * - benefit_usage rows are upserted via UNIQUE(policy_id, period_key, item_code)
 */
@Injectable()
export class PolicyActivatedHandler {
  private readonly logger = new Logger(PolicyActivatedHandler.name);

  constructor(
    private readonly txService: TransactionService,
    private readonly outboxService: OutboxService,
    private readonly entitlementRepo: PolicyBenefitEntitlementRepository,
    private readonly usageRepo: PolicyBenefitUsageRepository,
  ) {}

  async handle(event: { policy_id: number; [key: string]: any }): Promise<void> {
    const policyId = Number(event.policy_id);

    await this.txService.run(async (queryRunner) => {
      // ── Step 1: Check / create entitlement ──────────────────────────────────
      let entitlement = await this.entitlementRepo.findActiveByPolicyId(policyId, queryRunner);

      if (!entitlement) {
        // Fetch catalog info from the policy + package (raw SQL — no cross-module dep)
        const rows: any[] = await queryRunner.manager.query(
          `SELECT p.id AS policy_id, p.package_code_snapshot, p.start_at,
                  pp.meta AS pkg_meta,
                  bc.code AS catalog_code, bc.version AS catalog_version
           FROM policy p
           JOIN policy_package pp ON pp.code = p.package_code_snapshot
           LEFT JOIN benefit_catalog bc
             ON bc.code = JSON_UNQUOTE(JSON_EXTRACT(pp.meta, '$.benefit_catalog_code'))
             AND bc.status = 'active'
           WHERE p.id = ?
           LIMIT 1`,
          [policyId],
        );

        if (!rows.length) {
          this.logger.warn(`M5: policy not found — policy_id=${policyId}`);
          return;
        }

        const row = rows[0];
        const pkgMeta = typeof row.pkg_meta === 'string' ? JSON.parse(row.pkg_meta) : row.pkg_meta ?? {};
        const catalogCode = row.catalog_code ?? pkgMeta.benefit_catalog_code ?? 'STANDARD_2024';
        const catalogVersion = row.catalog_version ?? 'v2024';
        const levelCode = pkgMeta.level_code ?? 'BASIC';

        // Fetch benefit items for this catalog
        const items: any[] = await queryRunner.manager.query(
          `SELECT bci.item_code, bci.annual_limit_amount, bci.annual_limit_count
           FROM benefit_catalog_item bci
           JOIN benefit_catalog bc ON bc.id = bci.catalog_id
           WHERE bc.code = ? AND bc.status = 'active'`,
          [catalogCode],
        );

        const benefits = items.map((item: any) => ({
          item_code: item.item_code,
          annual_limit_amount: parseFloat(item.annual_limit_amount ?? '0'),
          annual_limit_count: item.annual_limit_count ?? null,
        }));

        const entitlementId = await this.entitlementRepo.create(
          {
            policy_id: policyId,
            catalog_code_snapshot: catalogCode,
            catalog_version_snapshot: catalogVersion,
            level_code_snapshot: levelCode,
            status: 'active',
            start_at: row.start_at ? new Date(row.start_at) : new Date(),
            end_at: null,
            entitlement_json: { catalog_code: catalogCode, catalog_version: catalogVersion, level_code: levelCode, benefits },
          },
          queryRunner,
        );

        entitlement = await this.entitlementRepo.findById(entitlementId, queryRunner);
        this.logger.log(`M5: created entitlement id=${entitlementId} for policy_id=${policyId}`);
      }

      // ── Step 2: Initialise usage rows for current period ──────────────────
      const periodKey = currentPeriodKey();
      const entJson = typeof entitlement!.entitlement_json === 'string'
        ? JSON.parse(entitlement!.entitlement_json)
        : entitlement!.entitlement_json;

      const benefits: { item_code: string }[] = entJson?.benefits ?? [];

      for (const benefit of benefits) {
        await this.usageRepo.upsert(
          {
            policy_id: policyId,
            period_key: periodKey,
            item_code: benefit.item_code,
            used_amount: '0.00',
            used_count: 0,
            reserved_amount: '0.00',
            reserved_count: 0,
            status: 'open',
          },
          queryRunner,
        );
      }

      this.logger.log(
        `M5: initialised ${benefits.length} usage row(s) for policy_id=${policyId}, period=${periodKey}`,
      );

      // ── Step 3: Emit ───────────────────────────────────────────────────────
      await this.outboxService.enqueue(
        {
          event_name: 'BENEFIT_RECORDS_INITIALISED',
          event_version: 1,
          aggregate_type: 'POLICY',
          aggregate_id: String(policyId),
          actor_user_id: 'system',
          occurred_at: new Date(),
          correlation_id: `policy-activated-${policyId}`,
          causation_id: `event-policy-activated-${policyId}`,
          payload: {
            policy_id: policyId,
            period_key: periodKey,
            benefit_count: benefits.length,
          },
        },
        queryRunner,
      );
    });
  }
}

/** Returns period key in YYYY-MM format (e.g. "2026-03") */
function currentPeriodKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
