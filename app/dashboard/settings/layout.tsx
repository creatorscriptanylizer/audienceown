import { SettingsFrame } from "@/components/settings-navigation";
import "./settings-workspace.css";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsFrame>{children}</SettingsFrame>;
}
