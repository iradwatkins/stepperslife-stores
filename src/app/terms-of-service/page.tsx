"use client";

import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function TermsOfServicePage() {
  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-muted py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-card rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: December 29, 2025</p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            {/* Agreement */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Agreement to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using SteppersLife (&quot;the Service&quot;), you agree to be bound by these Terms of Service
                (&quot;Terms&quot;). If you disagree with any part of the terms, you may not access the Service.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                These Terms apply to all visitors, users, and others who access or use the Service,
                including event organizers, ticket buyers, vendors, and marketplace participants.
              </p>
            </section>

            {/* Description of Service */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                SteppersLife is an event ticketing and marketplace platform that enables:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-2">
                <li>Event organizers to create, manage, and sell tickets to events</li>
                <li>Users to discover and purchase tickets to events</li>
                <li>Vendors to sell products and merchandise</li>
                <li>Hotel and accommodation bookings for events</li>
                <li>Team-based ticket sales and affiliate programs</li>
              </ul>
            </section>

            {/* User Accounts */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Accounts</h2>

              <h3 className="text-xl font-medium text-foreground mb-3">3.1 Account Creation</h3>
              <p className="text-muted-foreground leading-relaxed">
                To use certain features of the Service, you must register for an account. You must provide
                accurate, complete, and current information during registration. You are responsible for
                safeguarding your account credentials and for all activities under your account.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">3.2 Account Types</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>User:</strong> Can purchase tickets, browse events, and buy products</li>
                <li><strong>Organizer:</strong> Can create and manage events, sell tickets, and view earnings</li>
                <li><strong>Vendor:</strong> Can list and sell products in the marketplace</li>
                <li><strong>Team Member:</strong> Can sell tickets on behalf of organizers</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">3.3 Account Termination</h3>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your account at any time for violations of
                these Terms, fraudulent activity, or any other reason at our sole discretion.
              </p>
            </section>

            {/* Event Organizers */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Event Organizers</h2>

              <h3 className="text-xl font-medium text-foreground mb-3">4.1 Organizer Responsibilities</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                As an event organizer, you agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide accurate event information including date, time, venue, and pricing</li>
                <li>Host the event as advertised or provide refunds if canceled</li>
                <li>Comply with all applicable laws and venue requirements</li>
                <li>Obtain necessary permits, licenses, and insurance</li>
                <li>Handle attendee inquiries and issues professionally</li>
                <li>Not engage in deceptive or fraudulent practices</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">4.2 Fees and Payouts</h3>
              <p className="text-muted-foreground leading-relaxed">
                SteppersLife charges a platform fee on ticket sales. Fee structures are disclosed during
                event creation. Payouts are processed according to our payout schedule, typically within
                7 business days after the event concludes.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">4.3 Cancellations and Refunds</h3>
              <p className="text-muted-foreground leading-relaxed">
                Organizers are responsible for their refund policies, which must be clearly communicated.
                If an event is canceled, organizers must process refunds within 14 days. SteppersLife
                may process refunds on behalf of organizers in cases of non-compliance.
              </p>
            </section>

            {/* Ticket Buyers */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Ticket Buyers</h2>

              <h3 className="text-xl font-medium text-foreground mb-3">5.1 Purchasing Tickets</h3>
              <p className="text-muted-foreground leading-relaxed">
                All ticket sales are final unless the event is canceled or the organizer&apos;s refund policy
                permits refunds. Review event details and refund policies before purchasing.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">5.2 Ticket Transfers</h3>
              <p className="text-muted-foreground leading-relaxed">
                Ticket transfer policies are set by event organizers. Some tickets may be transferable
                while others are non-transferable. Check the event details for transfer policies.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">5.3 Event Admission</h3>
              <p className="text-muted-foreground leading-relaxed">
                A valid ticket grants entry to an event but does not guarantee specific services or
                experiences. Event organizers and venues reserve the right to refuse entry for
                violation of venue policies, safety concerns, or other legitimate reasons.
              </p>
            </section>

            {/* Marketplace */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Marketplace</h2>

              <h3 className="text-xl font-medium text-foreground mb-3">6.1 Vendor Responsibilities</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Vendors listing products on SteppersLife agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide accurate product descriptions and images</li>
                <li>Ship products within stated timeframes</li>
                <li>Handle returns and customer service professionally</li>
                <li>Comply with all applicable consumer protection laws</li>
                <li>Not sell counterfeit, illegal, or prohibited items</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">6.2 Buyer Responsibilities</h3>
              <p className="text-muted-foreground leading-relaxed">
                Buyers should review product descriptions, vendor ratings, and return policies before
                purchasing. Disputes should first be resolved directly with the vendor before
                escalating to SteppersLife support.
              </p>
            </section>

            {/* Payments */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Payments and Fees</h2>

              <h3 className="text-xl font-medium text-foreground mb-3">7.1 Payment Processing</h3>
              <p className="text-muted-foreground leading-relaxed">
                All payments are processed through our third-party payment providers (Stripe, PayPal).
                By making a purchase, you agree to the payment provider&apos;s terms of service.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">7.2 Platform Fees</h3>
              <p className="text-muted-foreground leading-relaxed">
                SteppersLife charges platform fees on transactions. Fee structures are disclosed before
                transactions are completed. Fees are subject to change with notice.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">7.3 Taxes</h3>
              <p className="text-muted-foreground leading-relaxed">
                Users are responsible for determining and paying any applicable taxes. Event organizers
                and vendors are responsible for sales tax collection and remittance where required.
              </p>
            </section>

            {/* Prohibited Activities */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Prohibited Activities</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to engage in any of the following prohibited activities:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Creating fake events or listings to defraud users</li>
                <li>Purchasing tickets with intent to scalp at inflated prices</li>
                <li>Using bots or automated tools to purchase tickets</li>
                <li>Harassing, threatening, or abusing other users</li>
                <li>Posting illegal, offensive, or harmful content</li>
                <li>Attempting to circumvent security measures</li>
                <li>Infringing on intellectual property rights</li>
                <li>Violating any applicable laws or regulations</li>
                <li>Impersonating another person or entity</li>
                <li>Distributing spam, malware, or phishing content</li>
              </ul>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Intellectual Property</h2>

              <h3 className="text-xl font-medium text-foreground mb-3">9.1 Our Content</h3>
              <p className="text-muted-foreground leading-relaxed">
                The Service and its original content, features, and functionality are owned by
                SteppersLife and are protected by copyright, trademark, and other intellectual property laws.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">9.2 User Content</h3>
              <p className="text-muted-foreground leading-relaxed">
                By posting content on SteppersLife, you grant us a non-exclusive, worldwide, royalty-free
                license to use, display, and distribute that content in connection with the Service.
                You retain ownership of your content.
              </p>
            </section>

            {/* Disclaimers */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Disclaimers</h2>
              <p className="text-muted-foreground leading-relaxed">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
                EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
                SECURE, OR ERROR-FREE.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                SteppersLife is a platform connecting event organizers with attendees and vendors with
                buyers. We are not responsible for the quality, safety, or legality of events, products,
                or user interactions.
              </p>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, STEPPERSLIFE SHALL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS
                OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Our total liability for any claim arising from the Service shall not exceed the
                amount you paid to us in the twelve (12) months preceding the claim.
              </p>
            </section>

            {/* Indemnification */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify and hold harmless SteppersLife, its affiliates, officers,
                directors, employees, and agents from any claims, damages, losses, or expenses
                arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            {/* Dispute Resolution */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Dispute Resolution</h2>

              <h3 className="text-xl font-medium text-foreground mb-3">13.1 Informal Resolution</h3>
              <p className="text-muted-foreground leading-relaxed">
                Before filing a formal dispute, you agree to first contact us at support@stepperslife.com
                to attempt to resolve the dispute informally.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3 mt-4">13.2 Governing Law</h3>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by the laws of the State of [Your State], United States,
                without regard to its conflict of law provisions.
              </p>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">14. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of
                material changes by posting the new Terms on this page and updating the &quot;Last updated&quot;
                date. Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            {/* Severability */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">15. Severability</h2>
              <p className="text-muted-foreground leading-relaxed">
                If any provision of these Terms is found to be unenforceable, the remaining provisions
                will continue in full force and effect.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">16. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-muted rounded-lg p-6">
                <p className="text-foreground font-medium">SteppersLife</p>
                <p className="text-muted-foreground mt-2">Email: legal@stepperslife.com</p>
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
