"use client";

import {
  Phone,
  Mail,
  Globe,
  MapPin,
  ExternalLink,
} from "lucide-react";

interface ProviderContactProps {
  phone: string;
  email: string;
  website?: string;
  city: string;
  state: string;
  zipCode?: string;
  serviceArea?: string[];
}

export function ProviderContact({
  phone,
  email,
  website,
  city,
  state,
  zipCode,
  serviceArea,
}: ProviderContactProps) {
  // Format phone number for tel: link
  const phoneLink = `tel:${phone.replace(/[^\d+]/g, "")}`;

  // Format website URL
  const websiteUrl = website?.startsWith("http") ? website : `https://${website}`;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Contact Information
      </h2>

      <div className="space-y-4">
        {/* Phone */}
        <a
          href={phoneLink}
          className="flex items-center gap-3 text-foreground hover:text-primary transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Phone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{phone}</p>
            <p className="text-xs text-muted-foreground">Tap to call</p>
          </div>
        </a>

        {/* Email */}
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-3 text-foreground hover:text-primary transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium break-all">{email}</p>
            <p className="text-xs text-muted-foreground">Tap to email</p>
          </div>
        </a>

        {/* Website */}
        {website && (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-foreground hover:text-primary transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{website}</p>
              <p className="text-xs text-muted-foreground">Visit website</p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        )}

        {/* Location */}
        <div className="flex items-start gap-3 text-foreground">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">
              {city}, {state}
              {zipCode && ` ${zipCode}`}
            </p>
            {serviceArea && serviceArea.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Also serving:</p>
                <div className="flex flex-wrap gap-1">
                  {serviceArea.map((area) => (
                    <span
                      key={area}
                      className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
