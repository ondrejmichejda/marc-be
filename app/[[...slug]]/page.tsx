import fs from "fs";
import path from "path";

export default function CatchAllSpaPage() {
  const indexPath = path.join(process.cwd(), "public", "index.html");
  let html = "";
  try {
    if (fs.existsSync(indexPath)) {
      html = fs.readFileSync(indexPath, "utf-8");
    }
  } catch {
    html = "";
  }

  if (html) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        suppressHydrationWarning
        style={{ display: "contents" }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-sans">
      <div className="text-center space-y-2">
        <div className="text-3xl animate-pulse">⚡</div>
        <p className="text-sm font-medium text-zinc-300">Loading Marc Platform...</p>
      </div>
    </div>
  );
}
