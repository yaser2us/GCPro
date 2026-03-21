import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { PolicyPackageRepository } from '../repositories/policy-package.repo';
import { PolicyPackageRateRepository } from '../repositories/policy-package-rate.repo';
import { AuthGuard } from '../../../corekit/guards/auth.guard';
import { PermissionsGuard } from '../../../corekit/guards/permissions.guard';
import { RequirePermissions } from '../../../corekit/decorators/require-permissions.decorator';

/**
 * Policy Admin Controller
 * Handles master data management for Policy pillar
 * - Policy Packages (insurance plans)
 * - Policy Package Rates (pricing by age/smoker)
 */
@Controller('/api/v1/policy/admin')
@UseGuards(AuthGuard, PermissionsGuard)
export class PolicyAdminController {
  constructor(
    private readonly packageRepo: PolicyPackageRepository,
    private readonly rateRepo: PolicyPackageRateRepository,
  ) {}

  // ============================================================
  // POLICY PACKAGE ENDPOINTS
  // ============================================================

  /**
   * CREATE POLICY PACKAGE
   * POST /api/v1/policy/admin/packages
   */
  @Post('packages')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('policy:admin')
  async createPackage(@Body() data: any) {
    const packageId = await this.packageRepo.create({
      code: data.code,
      name: data.name,
      monthly_max_cap_default: data.monthly_max_cap_default || 0,
      deposit_capacity_multiplier: data.deposit_capacity_multiplier || 2.0,
      min_deposit_pct: data.min_deposit_pct || 0.5,
      warning_pct: data.warning_pct || 0.6,
      urgent_pct: data.urgent_pct || 0.5,
      meta: data.meta || null,
    });

    return {
      package_id: packageId,
      code: data.code,
      name: data.name,
      message: 'Policy package created successfully',
    };
  }

  /**
   * GET ALL POLICY PACKAGES
   * GET /api/v1/policy/admin/packages
   */
  @Get('packages')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:read')
  async getPackages() {
    // This would need a findAll method in the repository
    // For now, returning empty array - implement as needed
    return {
      packages: [],
      message: 'Use repository findAll method or raw query',
    };
  }

  /**
   * GET POLICY PACKAGE BY ID
   * GET /api/v1/policy/admin/packages/:id
   */
  @Get('packages/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:read')
  async getPackageById(@Param('id') id: string) {
    const pkg = await this.packageRepo.findById(Number(id));
    if (!pkg) {
      throw new Error(`Policy package with ID ${id} not found`);
    }
    return pkg;
  }

  /**
   * UPDATE POLICY PACKAGE
   * PUT /api/v1/policy/admin/packages/:id
   */
  @Put('packages/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:admin')
  async updatePackage(@Param('id') id: string, @Body() data: any) {
    await this.packageRepo.update(Number(id), {
      name: data.name,
      monthly_max_cap_default: data.monthly_max_cap_default,
      deposit_capacity_multiplier: data.deposit_capacity_multiplier,
      min_deposit_pct: data.min_deposit_pct,
      warning_pct: data.warning_pct,
      urgent_pct: data.urgent_pct,
      meta: data.meta,
    });

    return {
      package_id: id,
      message: 'Policy package updated successfully',
    };
  }

  // ============================================================
  // POLICY PACKAGE RATE ENDPOINTS
  // ============================================================

  /**
   * CREATE POLICY PACKAGE RATE
   * POST /api/v1/policy/admin/packages/:packageId/rates
   */
  @Post('packages/:packageId/rates')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('policy:admin')
  async createRate(@Param('packageId') packageId: string, @Body() data: any) {
    const rateId = await this.rateRepo.create({
      package_id: Number(packageId),
      age_band_id: data.age_band_id,
      smoker_profile_id: data.smoker_profile_id,
      annual_fee_amount: data.annual_fee_amount || 0,
      monthly_max_cap: data.monthly_max_cap || 0,
      weightage_factor: data.weightage_factor || null,
      rate_version: data.rate_version,
      effective_from: new Date(data.effective_from),
      effective_to: data.effective_to ? new Date(data.effective_to) : null,
    });

    return {
      rate_id: rateId,
      package_id: packageId,
      message: 'Policy package rate created successfully',
    };
  }

  /**
   * GET RATES FOR PACKAGE
   * GET /api/v1/policy/admin/packages/:packageId/rates
   */
  @Get('packages/:packageId/rates')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:read')
  async getPackageRates(
    @Param('packageId') packageId: string,
    @Query('rate_version') rateVersion?: string,
  ) {
    // This would need a findByPackageId method in the repository
    // For now, returning empty array - implement as needed
    return {
      package_id: packageId,
      rate_version: rateVersion || 'all',
      rates: [],
      message: 'Use repository findByPackageId method or raw query',
    };
  }

  /**
   * GET RATE BY ID
   * GET /api/v1/policy/admin/rates/:id
   */
  @Get('rates/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:read')
  async getRateById(@Param('id') id: string) {
    const rate = await this.rateRepo.findById(Number(id));
    if (!rate) {
      throw new Error(`Policy package rate with ID ${id} not found`);
    }
    return rate;
  }

  /**
   * UPDATE POLICY PACKAGE RATE
   * PUT /api/v1/policy/admin/rates/:id
   */
  @Put('rates/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('policy:admin')
  async updateRate(@Param('id') id: string, @Body() data: any) {
    await this.rateRepo.update(Number(id), {
      annual_fee_amount: data.annual_fee_amount,
      monthly_max_cap: data.monthly_max_cap,
      weightage_factor: data.weightage_factor,
      effective_to: data.effective_to ? new Date(data.effective_to) : null,
    });

    return {
      rate_id: id,
      message: 'Policy package rate updated successfully',
    };
  }
}
