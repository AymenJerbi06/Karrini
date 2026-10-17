import { notFound } from "next/navigation";
import { BoardLab } from "@/components/classroom/board/BoardLab";
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <BoardLab />;
}
