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
      <div className="text-center space-y-4 flex flex-col items-center">
        <div className="w-14 h-14 relative flex items-center justify-center rounded-xl shadow-xl shadow-indigo-500/20 overflow-hidden animate-pulse">
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full block">
            <defs>
              <linearGradient id="marcBgGradLoading" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="55%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
              <linearGradient id="marcFlameGradLoading" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F97316" />
                <stop offset="50%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>
              <linearGradient id="marcShieldGradLoading" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <rect width="36" height="36" rx="9" fill="url(#marcBgGradLoading)" />
            <rect x="0.5" y="0.5" width="35" height="35" rx="8.5" stroke="white" strokeOpacity="0.25" strokeWidth="1" />
            <path
              d="M18 6.5L26 10.2V17.5C26 22.8 22.6 27.6 18 29.5C13.4 27.6 10 22.8 10 17.5V10.2L18 6.5Z"
              fill="url(#marcShieldGradLoading)"
              stroke="white"
              strokeWidth="1.25"
              strokeLinejoin="round"
              strokeOpacity="0.9"
            />
            <path
              d="M13.5 20.5V13.5L17.5 19L18.5 19L22.5 13.5V20.5"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18 10.5C18.8 12.2 20 13.5 20 15.2C20 16.3 19.1 17.2 18 17.2C16.9 17.2 16 16.3 16 15.2C16 13.5 17.2 12.2 18 10.5Z"
              fill="url(#marcFlameGradLoading)"
            />
            <circle cx="18" cy="24.5" r="1.2" fill="#E0F2FE" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-300">Loading Marc Platform...</p>
      </div>
    </div>
  );
}
