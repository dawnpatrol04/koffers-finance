import { CompanyLogo } from "@/components/company-logo";
import { CompanyName } from "@/components/company-name";
import { CompanyEmail } from "@/components/company-email";
import { Suspense } from "react";

function SettingsContent() {
  return (
    <div className="space-y-12">
      <CompanyLogo />
      <CompanyName />
      <CompanyEmail />
    </div>
  );
}

export default function GeneralSettings() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
