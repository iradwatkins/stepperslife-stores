import { Suspense } from "react";
import { Metadata } from "next";
import { CreateWizardClient } from "./CreateWizardClient";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export const metadata: Metadata = {
  title: "Get Started | SteppersLife",
  description: "Join the SteppersLife community. Create events, teach classes, offer services, partner as a restaurant, or sell on our marketplace.",
  openGraph: {
    title: "Get Started | SteppersLife",
    description: "Join the SteppersLife community. Create events, teach classes, offer services, partner as a restaurant, or sell on our marketplace.",
    type: "website",
    url: "https://stepperslife.com/create",
  },
};

function LoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader showCreateButton={false} />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CreateWizardClient />
    </Suspense>
  );
}
