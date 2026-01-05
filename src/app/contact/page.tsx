"use client";

import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Mail, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

interface ValidationError {
  field: string;
  message: string;
}

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.status === 429) {
        toast.error("Too many requests. Please try again later.");
        return;
      }

      if (response.status === 400 && data.errors) {
        // Handle validation errors
        const errors: Record<string, string> = {};
        data.errors.forEach((err: ValidationError) => {
          errors[err.field] = err.message;
        });
        setFieldErrors(errors);
        toast.error("Please check the form for errors.");
        return;
      }

      if (!response.ok) {
        toast.error(data.error || "Failed to send message. Please try again.");
        return;
      }

      // Success
      toast.success("Message sent successfully!");
      setSubmitted(true);
    } catch (error) {
      console.error("Contact form error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PublicHeader />
      <div className="min-h-screen bg-muted">
        {/* Hero Section */}
        <div className="bg-primary text-primary-foreground py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-xl opacity-90">
              Have a question or feedback? We&apos;d love to hear from you.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Contact Info */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-card rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold text-foreground mb-6">Get in Touch</h2>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Email</h3>
                        <a
                          href="mailto:support@stepperslife.com"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          support@stepperslife.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Live Chat</h3>
                        <p className="text-muted-foreground">Available on our platform</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Response Time</h3>
                        <p className="text-muted-foreground">Within 24-48 hours</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FAQ Link */}
                <div className="bg-card rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-bold text-foreground mb-3">Common Questions</h2>
                  <p className="text-muted-foreground mb-4">
                    Check our help center for answers to frequently asked questions.
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/help">Visit Help Center</a>
                  </Button>
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-2">
                <div className="bg-card rounded-lg shadow-sm p-8">
                  <h2 className="text-xl font-bold text-foreground mb-6">Send Us a Message</h2>

                  {submitted ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                      <p className="text-muted-foreground mb-6">
                        Thank you for reaching out. We&apos;ll get back to you within 24-48 hours.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSubmitted(false);
                          setFormData({ name: "", email: "", subject: "", message: "" });
                          setFieldErrors({});
                        }}
                      >
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Your Name</Label>
                          <Input
                            id="name"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={(e) => {
                              setFormData({ ...formData, name: e.target.value });
                              if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: "" });
                            }}
                            className={fieldErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                            required
                          />
                          {fieldErrors.name && (
                            <p className="text-sm text-red-500">{fieldErrors.name}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={(e) => {
                              setFormData({ ...formData, email: e.target.value });
                              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
                            }}
                            className={fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                            required
                          />
                          {fieldErrors.email && (
                            <p className="text-sm text-red-500">{fieldErrors.email}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          placeholder="How can we help?"
                          value={formData.subject}
                          onChange={(e) => {
                            setFormData({ ...formData, subject: e.target.value });
                            if (fieldErrors.subject) setFieldErrors({ ...fieldErrors, subject: "" });
                          }}
                          className={fieldErrors.subject ? "border-red-500 focus-visible:ring-red-500" : ""}
                          required
                        />
                        {fieldErrors.subject && (
                          <p className="text-sm text-red-500">{fieldErrors.subject}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          placeholder="Tell us more about your question or feedback..."
                          rows={6}
                          value={formData.message}
                          onChange={(e) => {
                            setFormData({ ...formData, message: e.target.value });
                            if (fieldErrors.message) setFieldErrors({ ...fieldErrors, message: "" });
                          }}
                          className={fieldErrors.message ? "border-red-500 focus-visible:ring-red-500" : ""}
                          required
                        />
                        {fieldErrors.message && (
                          <p className="text-sm text-red-500">{fieldErrors.message}</p>
                        )}
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Sending..." : "Send Message"}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  );
}
