export function FullPageLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin"></div>
        <div className="absolute inset-[6px] rounded-full border-t-2 border-white/80 animate-spin-slow"></div>
        <div className="absolute inset-[12px] rounded-full border-t-2 border-white/60 animate-spin-slower"></div>
      </div>
      <p className="text-white mt-4 font-medium">Loading...</p>
    </div>
  );
} 