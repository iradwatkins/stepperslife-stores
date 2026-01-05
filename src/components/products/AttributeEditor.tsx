"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  values: string[];
  isVariation: boolean;
  isVisible: boolean;
  sortOrder?: number;
}

interface AttributeEditorProps {
  attributes: ProductAttribute[];
  onChange: (attributes: ProductAttribute[]) => void;
}

// Common attribute presets
const ATTRIBUTE_PRESETS = [
  { name: "Size", slug: "size", values: ["XS", "S", "M", "L", "XL", "XXL"] },
  { name: "Color", slug: "color", values: ["Black", "White", "Red", "Blue", "Green"] },
  { name: "Material", slug: "material", values: ["Cotton", "Polyester", "Blend"] },
  { name: "Style", slug: "style", values: ["Regular", "Slim", "Relaxed"] },
];

export function AttributeEditor({ attributes, onChange }: AttributeEditorProps) {
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(
    new Set()
  );
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>(
    {}
  );

  // Generate unique ID
  const generateId = () => `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Generate slug from name
  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  // Add new attribute
  const addAttribute = (preset?: typeof ATTRIBUTE_PRESETS[0]) => {
    const newAttribute: ProductAttribute = preset
      ? {
          id: generateId(),
          name: preset.name,
          slug: preset.slug,
          values: [...preset.values],
          isVariation: true,
          isVisible: true,
          sortOrder: attributes.length,
        }
      : {
          id: generateId(),
          name: "",
          slug: "",
          values: [],
          isVariation: true,
          isVisible: true,
          sortOrder: attributes.length,
        };

    onChange([...attributes, newAttribute]);
    setExpandedAttributes((prev) => new Set([...prev, newAttribute.id]));
  };

  // Remove attribute
  const removeAttribute = (id: string) => {
    onChange(attributes.filter((attr) => attr.id !== id));
    setExpandedAttributes((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Update attribute
  const updateAttribute = (
    id: string,
    updates: Partial<ProductAttribute>
  ) => {
    onChange(
      attributes.map((attr) =>
        attr.id === id ? { ...attr, ...updates } : attr
      )
    );
  };

  // Update attribute name and auto-generate slug
  const updateAttributeName = (id: string, name: string) => {
    const attr = attributes.find((a) => a.id === id);
    const updates: Partial<ProductAttribute> = { name };

    // Auto-generate slug if it's empty or matches old name pattern
    if (!attr?.slug || attr.slug === generateSlug(attr.name)) {
      updates.slug = generateSlug(name);
    }

    updateAttribute(id, updates);
  };

  // Add value to attribute
  const addValue = (attrId: string, value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    const attr = attributes.find((a) => a.id === attrId);
    if (!attr) return;

    // Don't add duplicates
    if (attr.values.includes(trimmedValue)) return;

    updateAttribute(attrId, {
      values: [...attr.values, trimmedValue],
    });
    setNewValueInputs((prev) => ({ ...prev, [attrId]: "" }));
  };

  // Remove value from attribute
  const removeValue = (attrId: string, value: string) => {
    const attr = attributes.find((a) => a.id === attrId);
    if (!attr) return;

    updateAttribute(attrId, {
      values: attr.values.filter((v) => v !== value),
    });
  };

  // Toggle attribute expansion
  const toggleExpanded = (id: string) => {
    setExpandedAttributes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle key press in value input
  const handleValueKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>,
    attrId: string
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addValue(attrId, newValueInputs[attrId] || "");
    }
  };

  return (
    <div className="space-y-4">
      {/* Attribute List */}
      {attributes.length === 0 ? (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <p className="text-muted-foreground mb-4">
            No attributes defined. Add attributes to create product variations.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {ATTRIBUTE_PRESETS.map((preset) => (
              <Button
                key={preset.slug}
                variant="outline"
                size="sm"
                onClick={() => addAttribute(preset)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {preset.name}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => addAttribute()}>
              <Plus className="h-4 w-4 mr-1" />
              Custom
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {attributes.map((attr, index) => {
            const isExpanded = expandedAttributes.has(attr.id);
            return (
              <Card key={attr.id}>
                <Collapsible open={isExpanded}>
                  <div className="flex items-center gap-3 p-4">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />

                    <CollapsibleTrigger
                      onClick={() => toggleExpanded(attr.id)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {attr.name || "Untitled Attribute"}
                          </span>
                          {attr.isVariation && (
                            <Badge variant="secondary" className="text-xs">
                              Used for variations
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {attr.values.slice(0, 5).map((value) => (
                            <Badge
                              key={value}
                              variant="outline"
                              className="text-xs"
                            >
                              {value}
                            </Badge>
                          ))}
                          {attr.values.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{attr.values.length - 5} more
                            </Badge>
                          )}
                          {attr.values.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              No values
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </CollapsibleTrigger>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeAttribute(attr.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* Attribute Name & Slug */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Attribute Name</Label>
                          <Input
                            value={attr.name}
                            onChange={(e) =>
                              updateAttributeName(attr.id, e.target.value)
                            }
                            placeholder="e.g., Size, Color, Material"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Slug (URL-safe)</Label>
                          <Input
                            value={attr.slug}
                            onChange={(e) =>
                              updateAttribute(attr.id, {
                                slug: generateSlug(e.target.value),
                              })
                            }
                            placeholder="e.g., size, color"
                          />
                        </div>
                      </div>

                      {/* Attribute Options */}
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${attr.id}-variation`}
                            checked={attr.isVariation}
                            onCheckedChange={(checked) =>
                              updateAttribute(attr.id, {
                                isVariation: checked === true,
                              })
                            }
                          />
                          <Label
                            htmlFor={`${attr.id}-variation`}
                            className="text-sm cursor-pointer"
                          >
                            Used for variations
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${attr.id}-visible`}
                            checked={attr.isVisible}
                            onCheckedChange={(checked) =>
                              updateAttribute(attr.id, {
                                isVisible: checked === true,
                              })
                            }
                          />
                          <Label
                            htmlFor={`${attr.id}-visible`}
                            className="text-sm cursor-pointer"
                          >
                            Visible on product page
                          </Label>
                        </div>
                      </div>

                      {/* Attribute Values */}
                      <div className="space-y-2">
                        <Label>Values</Label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
                          {attr.values.map((value) => (
                            <Badge
                              key={value}
                              variant="secondary"
                              className="flex items-center gap-1 pr-1"
                            >
                              {value}
                              <button
                                type="button"
                                onClick={() => removeValue(attr.id, value)}
                                className="ml-1 hover:bg-muted rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {attr.values.length === 0 && (
                            <span className="text-sm text-muted-foreground">
                              Add values below
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={newValueInputs[attr.id] || ""}
                            onChange={(e) =>
                              setNewValueInputs((prev) => ({
                                ...prev,
                                [attr.id]: e.target.value,
                              }))
                            }
                            onKeyPress={(e) => handleValueKeyPress(e, attr.id)}
                            placeholder="Type a value and press Enter"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              addValue(attr.id, newValueInputs[attr.id] || "")
                            }
                          >
                            Add
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Press Enter or click Add to add each value. Separate
                          multiple values by adding them one at a time.
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Attribute Button */}
      {attributes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => addAttribute()}>
            <Plus className="h-4 w-4 mr-1" />
            Add Custom Attribute
          </Button>
          {ATTRIBUTE_PRESETS.filter(
            (preset) => !attributes.some((a) => a.slug === preset.slug)
          ).map((preset) => (
            <Button
              key={preset.slug}
              variant="ghost"
              size="sm"
              onClick={() => addAttribute(preset)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {preset.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
