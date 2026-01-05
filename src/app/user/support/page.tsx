"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Mail, Phone, FileText, HelpCircle, Send, ExternalLink, Loader2, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function SupportPage() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error("Please fill in both subject and message");
      return;
    }

    setIsSubmitting(true);

    try {
      // Send support request via email API
      const response = await fetch("/api/send-support-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: formData.subject.trim(),
          message: formData.message.trim(),
          userEmail: currentUser?.email || "anonymous",
          userName: currentUser?.name || "Anonymous User",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send support request");
      }

      toast.success("Support request submitted! We'll respond within 24 hours.");
      setFormData({ subject: "", message: "" });
    } catch (error) {
      // Fallback: open email client with pre-filled content
      const mailtoLink = `mailto:support@stepperslife.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
        `From: ${currentUser?.name || "User"} (${currentUser?.email || "Not logged in"})\n\n${formData.message}`
      )}`;
      window.location.href = mailtoLink;
      toast.info("Opening your email client...");
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      question: "How do I purchase tickets?",
      answer:
        "Browse events, select your desired event, choose the number of tickets, and proceed to checkout.",
    },
    {
      question: "Can I get a refund?",
      answer:
        "Refund policies vary by event. Check the event details page or contact the organizer directly.",
    },
    {
      question: "How do I access my tickets?",
      answer:
        "Your tickets are available in the 'My Tickets' section. You can view, download, or share them from there.",
    },
    {
      question: "What if I lose my ticket?",
      answer:
        "Don't worry! Your tickets are saved in your account and can be accessed anytime from 'My Tickets'.",
    },
    {
      question: "Can I transfer my ticket to someone else?",
      answer:
        "Yes, you can transfer tickets through the ticket details page. The recipient will receive an email notification.",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
        <p className="text-muted-foreground mt-2">
          Get help with your account, tickets, and more
        </p>
      </div>

      {/* Contact Options */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-2 right-2 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Coming Soon
          </div>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-base text-muted-foreground">Live Chat</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Chat with our support team in real-time
            </p>
            <Button variant="outline" className="w-full" disabled>
              Start Chat
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Email Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Get help via email within 24 hours
            </p>
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:support@stepperslife.com">
                Send Email
                <ExternalLink className="h-3 w-3 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Phone Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Call us Monday-Friday, 9am-5pm EST
            </p>
            <Button variant="outline" className="w-full" asChild>
              <a href="tel:+1-555-STEPPERS">
                Call Now
                <ExternalLink className="h-3 w-3 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Submit Support Ticket */}
      <Card>
        <CardHeader>
          <CardTitle>Submit a Support Ticket</CardTitle>
          <CardDescription>
            Describe your issue and we'll get back to you as soon as possible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief description of your issue"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Provide detailed information about your issue..."
                className="min-h-[150px]"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Ticket
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData({ subject: "", message: "" })}
                disabled={isSubmitting}
              >
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            <CardTitle>Frequently Asked Questions</CardTitle>
          </div>
          <CardDescription>Quick answers to common questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="pb-4 border-b last:border-b-0 last:pb-0">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Help Resources */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Help Resources</CardTitle>
          </div>
          <CardDescription>Guides and documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              User Guide
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Terms of Service
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Privacy Policy
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Community Guidelines
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
