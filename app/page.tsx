import { StartPage } from "@/components/website/startpage";
import { Header } from "@/components/website/header";

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <Header />
      <div className="px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <StartPage />
        </div>
      </div>
    </div>
  );
}
