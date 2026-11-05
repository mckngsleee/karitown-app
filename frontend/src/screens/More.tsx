import { go } from "../store/actions";
import { useStore } from "../store/store";
import type { Screen } from "../store/types";
import { Icon, type IconName } from "../ui/Icon";
import { NavRow } from "../ui/parts";

export default function More() {
  const st = useStore();
  const n = st.ops.length;
  const items: [Screen, string, string, IconName][] = [
    ["prices", "Materials & prices", "Kalakal at presyo", "tag"],
    ["margin", "Margin", "Tantiyang kita sa bawat karga", "trend"],
    ["buyers", "Buyers", "Mga mamimili · directory + private", "building"],
    ["suppliers", "Suppliers", "Mga nagbebenta", "user"],
    ["sync", "Sync", "Pag-sync · " + (n ? n + " waiting" : "all uploaded"), "refresh"],
  ];
  return (
    <div className="col">
      {items.map(([id, label, sub, icon]) => (
        <NavRow key={id} icon={<Icon name={icon} />} title={label} sub={sub} onClick={() => go(id)} minHeight={68} />
      ))}
    </div>
  );
}
