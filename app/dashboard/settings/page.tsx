import { UserProfile } from "@/components/settings/user-profile";
import { CompanyLogo } from "@/components/settings/company-logo";
import { CompanyName } from "@/components/settings/company-name";
import { CompanyEmail } from "@/components/settings/company-email";
import { CompanyCountry } from "@/components/settings/company-country";
import { DeleteTeam } from "@/components/settings/delete-team";

export default function GeneralSettings() {
  return (
    <div className="space-y-12">
      {/* User Profile Section */}
      <UserProfile />

      {/* Company/Business Information (Optional) */}
      <div className="space-y-8">
        <div className="border-t pt-8">
          <h3 className="text-lg font-semibold mb-1">Business Information</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Optional: Add business details if you're tracking business expenses
          </p>
          <div className="space-y-8">
            <CompanyLogo />
            <CompanyName />
            <CompanyEmail />
            <CompanyCountry />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border-t pt-8">
        <DeleteTeam />
      </div>
    </div>
  );
}
