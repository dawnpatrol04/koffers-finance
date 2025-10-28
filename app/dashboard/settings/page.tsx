import { CompanyLogo } from "@/components/settings/company-logo";
import { CompanyName } from "@/components/settings/company-name";
import { CompanyEmail } from "@/components/settings/company-email";
import { CompanyCountry } from "@/components/settings/company-country";
import { DeleteTeam } from "@/components/settings/delete-team";

export default function GeneralSettings() {
  return (
    <div className="space-y-12">
      <CompanyLogo />
      <CompanyName />
      <CompanyEmail />
      <CompanyCountry />
      <DeleteTeam />
    </div>
  );
}
