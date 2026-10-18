import { GuideShell } from "@/components/guides/GuideShell";

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return <GuideShell>{children}</GuideShell>;
}
