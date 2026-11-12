import { NextRequest, NextResponse } from "next/server";
import { FireSafetySolutionService } from "@/lib/fss";

interface RouteContext {
  params: Promise<{ id: string; fileId: string }> | { id: string; fileId: string };
}

/**
 * GET /api/fss/[id]/files/[fileId]
 * Retrieves details of a specific technical documentation file.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id, fileId } = await context.params;
    const solution = await FireSafetySolutionService.getSolutionById(id);

    if (!solution) {
      return NextResponse.json(
        { error: `Fire Safety Solution with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    const file = (solution.files || []).find((f) => f.id === fileId);
    if (!file) {
      return NextResponse.json(
        { error: `File with ID '${fileId}' not found on solution '${id}'.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      file,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/fss/[id]/files/[fileId]
 * Deletes a technical documentation file from Vercel Blob and FSS record.
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id, fileId } = await context.params;
    const solution = await FireSafetySolutionService.getSolutionById(id);

    if (!solution) {
      return NextResponse.json(
        { error: `Fire Safety Solution with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    const fileExists = (solution.files || []).some((f) => f.id === fileId);
    if (!fileExists) {
      return NextResponse.json(
        { error: `File with ID '${fileId}' not found on solution '${id}'.` },
        { status: 404 }
      );
    }

    const updatedSolution = await FireSafetySolutionService.removeFileFromSolution(id, fileId);

    return NextResponse.json({
      success: true,
      message: `File '${fileId}' successfully deleted.`,
      files: updatedSolution.files || [],
      solution: updatedSolution,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
