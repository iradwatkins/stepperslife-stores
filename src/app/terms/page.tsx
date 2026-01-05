"use client";

import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function TermsPage() {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-card dark:bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-card rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-foreground dark:text-white mb-6">
            Terms of Service
          </h1>
          <p className="text-muted-foreground dark:text-muted-foreground mb-4">
            Terms of Service page coming soon.
          </p>
          <p className="text-muted-foreground dark:text-muted-foreground">
            For questions, please contact us at support@stepperslife.com
          </p>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
