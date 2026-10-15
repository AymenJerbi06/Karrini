import { T } from "@/components/I18n";

import { CheckIcon, StarOutlineIcon, TrendIcon } from "@/components/icons";

export function StatsBar() {
  return (
    <div className="flex w-full items-center justify-center gap-6 bg-gray-100 px-6 py-3 text-sm text-gray-500 md:justify-around">
      <div className="flex items-center gap-2">
        <CheckIcon className="h-5 w-5 text-brand" />
        <T>Local teachers</T>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <StarOutlineIcon className="h-5 w-5 text-amber-500" />
        <T>Clear monthly prices</T>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <TrendIcon className="h-5 w-5 text-blue-600" />
        <T>Live, interactive lessons</T>
      </div>
    </div>
  );
}
