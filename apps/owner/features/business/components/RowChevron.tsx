// The single chevron of the business slice: every row that opens an editor
// draws this; rows without an editor draw none.
import { ChevronRight } from "lucide-react";

export function RowChevron() {
  return <ChevronRight size={20} className="zukki-row-chevron" />;
}
