"use client";

import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function PrivacyPolicyPage() {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-muted py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: December 29, 2025</p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to SteppersLife (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your personal
                information and your right to privacy. This Privacy Policy explains how we collect, use, disclose,
                and safeguard your information when you visit our website stepperslife.com and use our services.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy,
                please do not access the site or use our services.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-medium text-foreground mb-3">2.1 Personal Information You Provide</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We collect personal information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Register for an account</li>
                <li>Purchase tickets or products</li>
                <li>Create or manage events</li>
                <li>Subscribe to our newsletter</li>
                <li>Contact us for support</li>
                <li>Participate in promotions or surveys</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                This information may include: name, email address, phone number, billing address,
                payment information, profile picture, and any other information you choose to provide.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-6">2.2 Information Automatically Collected</h3>
              <p className="text-muted-foreground leading-relaxed">
                When you visit our website, we automatically collect certain information about your device, including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-2">
                <li>IP address and location data</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Pages visited and time spent</li>
                <li>Referring website addresses</li>
                <li>Device identifiers</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-6">2.3 Payment Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                We use third-party payment processors (Stripe, PayPal) to handle payments. We do not store
                your full credit card numbers on our servers. Payment processors have their own privacy policies
                governing how they use your information.
              </p>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the information we collect for various purposes, including to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Communicate with you about events, products, and promotions</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect, investigate, and prevent fraudulent transactions and abuse</li>
                <li>Personalize and improve your experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            {/* Information Sharing */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may share your information in the following situations:
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3">4.1 With Event Organizers</h3>
              <p className="text-muted-foreground leading-relaxed">
                When you purchase tickets, your name and email may be shared with event organizers
                to facilitate entry and event communications.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">4.2 With Service Providers</h3>
              <p className="text-muted-foreground leading-relaxed">
                We share information with third-party vendors who provide services such as payment processing,
                email delivery, hosting, and analytics.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">4.3 For Legal Purposes</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may disclose information if required by law, court order, or government request,
                or to protect our rights, privacy, safety, or property.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">4.4 Business Transfers</h3>
              <p className="text-muted-foreground leading-relaxed">
                In connection with any merger, sale of company assets, or acquisition, your information
                may be transferred as a business asset.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Cookies and Tracking Technologies</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use cookies and similar tracking technologies to collect and track information about
                your browsing activities. You can instruct your browser to refuse all cookies or to indicate
                when a cookie is being sent.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Types of cookies we use:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-2">
                <li><strong>Essential cookies:</strong> Required for the website to function properly</li>
                <li><strong>Analytics cookies:</strong> Help us understand how visitors interact with our website</li>
                <li><strong>Preference cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Marketing cookies:</strong> Used to deliver relevant advertisements</li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your
                personal information against unauthorized access, alteration, disclosure, or destruction.
                These measures include encryption, secure servers, and regular security assessments.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure.
                While we strive to protect your personal information, we cannot guarantee its absolute security.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Your Privacy Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Depending on your location, you may have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate personal information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Opt-out:</strong> Opt out of marketing communications at any time</li>
                <li><strong>Withdraw consent:</strong> Withdraw consent where we rely on it for processing</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, please contact us at privacy@stepperslife.com.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as necessary to fulfill the purposes
                described in this privacy policy, unless a longer retention period is required by law.
                When we no longer need your information, we will securely delete or anonymize it.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Children&apos;s Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our services are not intended for children under 13 years of age. We do not knowingly
                collect personal information from children under 13. If you are a parent or guardian
                and believe your child has provided us with personal information, please contact us
                immediately.
              </p>
            </section>

            {/* International Transfers */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. International Data Transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information may be transferred to and processed in countries other than your own.
                These countries may have different data protection laws. We take appropriate safeguards
                to ensure your information remains protected in accordance with this privacy policy.
              </p>
            </section>

            {/* Changes to Policy */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any changes
                by posting the new privacy policy on this page and updating the &quot;Last updated&quot; date.
                We encourage you to review this privacy policy periodically.
              </p>
            </section>

            {/* Contact Us */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-muted rounded-lg p-6">
                <p className="text-foreground font-medium">SteppersLife</p>
                <p className="text-muted-foreground mt-2">Email: privacy@stepperslife.com</p>
                <p className="text-muted-foreground">Support: support@stepperslife.com</p>
                <p className="text-muted-foreground">Website: https://stepperslife.com</p>
              </div>
            </section>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
