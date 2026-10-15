import { T } from "@/components/I18n";

import type { ReactNode } from "react";

// Generic laptop frame; children render on the screen.
export function Laptop({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      <div className="mx-auto w-[84%] rounded-t-[18px] bg-gray-900 p-[2.2%] pb-[1.5%] shadow-xl">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[4px] bg-white">
          <T>{children}</T>
        </div>
      </div>
      <div className="relative h-[14px] rounded-b-[14px] bg-gradient-to-b from-gray-300 to-gray-400 shadow-md">
        <div className="absolute left-1/2 top-0 h-[5px] w-[16%] -translate-x-1/2 rounded-b-md bg-gray-500/60" />
      </div>
    </div>
  );
}
