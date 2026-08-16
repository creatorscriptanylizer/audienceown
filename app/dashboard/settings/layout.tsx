import { SettingsFrame } from "@/components/settings-navigation";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsFrame>{children}</SettingsFrame>;
}
