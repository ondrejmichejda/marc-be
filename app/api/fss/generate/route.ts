import { NextRequest, NextResponse } from "next/server";
import {
  FssPromptService,
  FireSafetySolutionService,
  FireSafetySolutionProperties,
  FssTechnicalDocumentationFile,
} from "@/lib/fss";
import { getCurrentUser } from "@/lib/auth";
import { RolesService } from "@/lib/auth/rolesService";

/**
 * POST /api/fss/generate
 * Generates one or all FSS properties in parallel using general AI prompts,
 * incorporating uploaded files and current project context.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    const body = await req.json().catch(() => ({}));

    const userIdentifier = currentUser?.email || currentUser?.id || "fss_user";
    const effectiveUserId = currentUser?.id || body.userId;
    const isSystemUser = currentUser?.role ? (await RolesService.getRole(currentUser.role))?.isSystem ?? false : false;

    let properties: Partial<FireSafetySolutionProperties> = body.properties || {};
    let files: FssTechnicalDocumentationFile[] = body.files || [];

    // If fssId is provided, enrich context from existing stored solution
    if (body.fssId) {
      const existing = await FireSafetySolutionService.getSolutionById(body.fssId, effectiveUserId, isSystemUser);
      if (existing) {
        properties = {
          ...existing,
          ...properties,
        };
        if (!body.files && existing.files) {
          files = existing.files;
        }
      }
    }
    const solutionId = body.fssId || body.solutionId;

    // 1. Single property generation
    if (body.fieldKey) {
      const result = await FssPromptService.generateProperty({
        fieldKey: body.fieldKey,
        properties,
        files,
        customInstructions: body.customInstructions,
        model: body.model,
        temperature: body.temperature,
        userIdentifier,
        userId: effectiveUserId,
        apiKey: body.apiKey,
      });

      let accumulatedCostUsd: number | undefined;
      let accumulatedTokens: number | undefined;
      let generationCount: number | undefined;

      if (solutionId && !result.error) {
        const updatedSolution = await FireSafetySolutionService.accumulateAiUsage(
          solutionId,
          result.estimatedCostUsd || 0,
          result.totalTokens || result.tokens || 0
        );
        if (updatedSolution) {
          accumulatedCostUsd = updatedSolution.totalCostUsd;
          accumulatedTokens = updatedSolution.totalTokens;
          generationCount = updatedSolution.generationCount;
        }
      }

      return NextResponse.json({
        success: !result.error,
        fieldKey: result.fieldKey,
        value: result.value,
        tokens: result.tokens,
        totalTokens: result.totalTokens,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        estimatedCostUsd: result.estimatedCostUsd,
        accumulatedCostUsd,
        accumulatedTokens,
        generationCount,
        fssId: solutionId,
        durationMs: result.durationMs,
        result,
      });
    }

    // 2. Parallel generation across multiple / all 18 properties
    const result = await FssPromptService.generateAllProperties({
      fieldKeys: body.fieldKeys,
      properties,
      files,
      customInstructions: body.customInstructions,
      model: body.model,
      temperature: body.temperature,
      userIdentifier,
      userId: effectiveUserId,
      apiKey: body.apiKey,
    });

    let accumulatedCostUsd: number | undefined;
    let accumulatedTokens: number | undefined;
    let generationCount: number | undefined;

    if (solutionId && result.success) {
      const updatedSolution = await FireSafetySolutionService.accumulateAiUsage(
        solutionId,
        result.estimatedTotalCostUsd || 0,
        result.totalTokens || result.tokens || 0
      );
      if (updatedSolution) {
        accumulatedCostUsd = updatedSolution.totalCostUsd;
        accumulatedTokens = updatedSolution.totalTokens;
        generationCount = updatedSolution.generationCount;
      }
    }

    return NextResponse.json({
      ...result,
      accumulatedCostUsd,
      accumulatedTokens,
      generationCount,
      fssId: solutionId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
