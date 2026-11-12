import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
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
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id, fileId } = await context.params;

    // Require authentication for file deletion
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required. Please log in to delete files." },
        { status: 401 }
      );
    }

    const solution = await FireSafetySolutionService.getSolutionById(id);

    if (!solution) {
      return NextResponse.json(
        { error: `Fire Safety Solution with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    // Verify ownership — only the solution owner can delete files
    if (solution.userId !== currentUser.id) {
      return NextResponse.json(
        { error: "You do not have permission to delete files from this solution." },
        { status: 403 }
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
