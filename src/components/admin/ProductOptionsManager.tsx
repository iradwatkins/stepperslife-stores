"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Type,
  Hash,
  CheckSquare,
  Circle,
  Square,
  Palette,
  Calendar,
  FileUp,
  Image as ImageIcon,
  AlignLeft,
} from "lucide-react";
import { toast } from "sonner";

type OptionType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "color"
  | "date"
  | "file"
  | "image_swatch";

interface Choice {
  id?: string;
  label: string;
  priceModifier: number;
  image?: string;
  default?: boolean;
}

interface ProductOption {
  id: string;
  name: string;
  description?: string;
  type: OptionType;
  required: boolean;
  choices?: Choice[];
  priceModifier?: number;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
  displayOrder: number;
}

interface ProductOptionsManagerProps {
  productId: Id<"products">;
  options?: ProductOption[];
}

const OPTION_TYPE_INFO: Record<
  OptionType,
  { icon: any; label: string; description: string; hasChoices: boolean }
> = {
  text: {
    icon: Type,
    label: "Text Input",
    description: "Single line text field",
    hasChoices: false,
  },
  textarea: {
    icon: AlignLeft,
    label: "Text Area",
    description: "Multi-line text field",
    hasChoices: false,
  },
  number: {
    icon: Hash,
    label: "Number",
    description: "Numeric input",
    hasChoices: false,
  },
  select: {
    icon: ChevronDown,
    label: "Dropdown",
    description: "Select from dropdown list",
    hasChoices: true,
  },
  radio: {
    icon: Circle,
    label: "Radio Buttons",
    description: "Choose one option",
    hasChoices: true,
  },
  checkbox: {
    icon: CheckSquare,
    label: "Checkboxes",
    description: "Choose multiple options",
    hasChoices: true,
  },
  color: {
    icon: Palette,
    label: "Color Picker",
    description: "Select a color",
    hasChoices: false,
  },
  date: {
    icon: Calendar,
    label: "Date Picker",
    description: "Select a date",
    hasChoices: false,
  },
  file: {
    icon: FileUp,
    label: "File Upload",
    description: "Upload a file",
    hasChoices: false,
  },
  image_swatch: {
    icon: ImageIcon,
    label: "Image Swatch",
    description: "Choose from image options",
    hasChoices: true,
  },
};

export default function ProductOptionsManager({
  productId,
  options = [],
}: ProductOptionsManagerProps) {
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());
  const [editingOption, setEditingOption] = useState<string | null>(null);

  const addOption = useMutation(api.products.mutations.addProductOption);
  const updateOption = useMutation(api.products.mutations.updateProductOption);
  const deleteOption = useMutation(api.products.mutations.deleteProductOption);
  const reorderOptions = useMutation(api.products.mutations.reorderProductOptions);

  const toggleExpand = (optionId: string) => {
    const newExpanded = new Set(expandedOptions);
    if (newExpanded.has(optionId)) {
      newExpanded.delete(optionId);
    } else {
      newExpanded.add(optionId);
    }
    setExpandedOptions(newExpanded);
  };

  const handleDeleteOption = async (optionId: string) => {
    if (confirm("Are you sure you want to delete this option?")) {
      try {
        await deleteOption({ productId, optionId });
      } catch (error) {
        console.error("Failed to delete option:", error);
        toast.error("Failed to delete option. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Product Options</h3>
          <p className="text-sm text-muted-foreground">
            Add customization options like gift wrapping, engraving, or special requests
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingOption(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Option
        </button>
      </div>

      {/* Existing Options List */}
      {options.length > 0 && (
        <div className="space-y-3">
          {options
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                productId={productId}
                isExpanded={expandedOptions.has(option.id)}
                isEditing={editingOption === option.id}
                onToggleExpand={() => toggleExpand(option.id)}
                onEdit={() => setEditingOption(option.id)}
                onCancelEdit={() => setEditingOption(null)}
                onDelete={() => handleDeleteOption(option.id)}
                updateOption={updateOption}
              />
            ))}
        </div>
      )}

      {/* Add New Option Form */}
      {isAddingOption && (
        <AddOptionForm
          productId={productId}
          onCancel={() => setIsAddingOption(false)}
          onSuccess={() => setIsAddingOption(false)}
          addOption={addOption}
        />
      )}

      {/* Empty State */}
      {options.length === 0 && !isAddingOption && (
        <div className="border-2 border-dashed border rounded-lg p-12 text-center">
          <Square className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No product options yet</h3>
          <p className="text-muted-foreground mb-6">
            Add options to let customers customize their purchase
          </p>
          <button
            type="button"
            onClick={() => setIsAddingOption(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Option
          </button>
        </div>
      )}
    </div>
  );
}

// Option Card Component
function OptionCard({
  option,
  productId,
  isExpanded,
  isEditing,
  onToggleExpand,
  onEdit,
  onCancelEdit,
  onDelete,
  updateOption,
}: {
  option: ProductOption;
  productId: Id<"products">;
  isExpanded: boolean;
  isEditing: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  updateOption: any;
}) {
  const typeInfo = OPTION_TYPE_INFO[option.type];
  const Icon = typeInfo.icon;

  if (isEditing) {
    return (
      <EditOptionForm
        productId={productId}
        option={option}
        onCancel={onCancelEdit}
        onSuccess={onCancelEdit}
        updateOption={updateOption}
      />
    );
  }

  return (
    <div className="border border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 hover:bg-card transition-colors">
        <button
          type="button" className="cursor-grab hover:bg-muted rounded p-1">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </button>

        <Icon className="w-5 h-5 text-primary" />

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">{option.name}</h4>
            {option.required && (
              <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-xs rounded-full">
                Required
              </span>
            )}
            <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
              {typeInfo.label}
            </span>
          </div>
          {option.description && <p className="text-sm text-muted-foreground mt-1">{option.description}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="px-3 py-1 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-1 text-sm text-destructive hover:bg-destructive/10 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border p-4 bg-card space-y-3">
          {/* Price Modifier */}
          {option.priceModifier !== undefined && (
            <div className="text-sm">
              <span className="font-medium text-foreground">Price: </span>
              <span className="text-foreground">
                {option.priceModifier >= 0 ? "+" : ""}${(option.priceModifier / 100).toFixed(2)}
              </span>
            </div>
          )}

          {/* Choices */}
          {typeInfo.hasChoices && option.choices && option.choices.length > 0 && (
            <div>
              <h5 className="font-medium text-foreground mb-2">Choices:</h5>
              <div className="space-y-2">
                {option.choices.map((choice) => (
                  <div
                    key={choice.id}
                    className="flex items-center justify-between bg-card p-2 rounded border border"
                  >
                    <div className="flex items-center gap-2">
                      {choice.image && (
                        <img
                          src={choice.image}
                          alt={choice.label}
                          className="w-8 h-8 object-cover rounded"
                        />
                      )}
                      <span className="text-sm text-foreground">{choice.label}</span>
                      {choice.default && (
                        <span className="px-2 py-0.5 bg-accent text-primary text-xs rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {choice.priceModifier >= 0 ? "+" : ""}$
                      {(choice.priceModifier / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Rules */}
          {(option.minLength !== undefined ||
            option.maxLength !== undefined ||
            option.minValue !== undefined ||
            option.maxValue !== undefined) && (
            <div className="text-sm">
              <span className="font-medium text-foreground">Validation: </span>
              {option.minLength !== undefined && (
                <span className="text-foreground">Min length: {option.minLength} </span>
              )}
              {option.maxLength !== undefined && (
                <span className="text-foreground">Max length: {option.maxLength} </span>
              )}
              {option.minValue !== undefined && (
                <span className="text-foreground">Min value: {option.minValue} </span>
              )}
              {option.maxValue !== undefined && (
                <span className="text-foreground">Max value: {option.maxValue}</span>
              )}
            </div>
          )}

          {/* Placeholder */}
          {option.placeholder && (
            <div className="text-sm">
              <span className="font-medium text-foreground">Placeholder: </span>
              <span className="text-muted-foreground italic">{option.placeholder}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Add Option Form Component
function AddOptionForm({
  productId,
  onCancel,
  onSuccess,
  addOption,
}: {
  productId: Id<"products">;
  onCancel: () => void;
  onSuccess: () => void;
  addOption: any;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "text" as OptionType,
    required: false,
    priceModifier: 0,
    placeholder: "",
    minLength: undefined as number | undefined,
    maxLength: undefined as number | undefined,
    minValue: undefined as number | undefined,
    maxValue: undefined as number | undefined,
  });

  const [choices, setChoices] = useState<Choice[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const typeInfo = OPTION_TYPE_INFO[formData.type];

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const optionData: any = {
        name: formData.name,
        type: formData.type,
        required: formData.required,
      };

      if (formData.description) {
        optionData.description = formData.description;
      }

      if (typeInfo.hasChoices) {
        if (choices.length === 0) {
          toast.error("Please add at least one choice for this option type");
          setIsSubmitting(false);
          return;
        }
        optionData.choices = choices;
      } else {
        if (formData.priceModifier !== 0) {
          optionData.priceModifier = Math.round(formData.priceModifier * 100);
        }
      }

      if (formData.placeholder) {
        optionData.placeholder = formData.placeholder;
      }

      if (formData.minLength !== undefined) {
        optionData.minLength = formData.minLength;
      }

      if (formData.maxLength !== undefined) {
        optionData.maxLength = formData.maxLength;
      }

      if (formData.minValue !== undefined) {
        optionData.minValue = formData.minValue;
      }

      if (formData.maxValue !== undefined) {
        optionData.maxValue = formData.maxValue;
      }

      await addOption({ productId, option: optionData });
      onSuccess();
    } catch (error) {
      console.error("Failed to add option:", error);
      toast.error("Failed to add option. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addChoice = () => {
    setChoices([...choices, { label: "", priceModifier: 0, default: choices.length === 0 }]);
  };

  const updateChoice = (index: number, field: keyof Choice, value: any) => {
    const newChoices = [...choices];
    newChoices[index] = { ...newChoices[index], [field]: value };
    setChoices(newChoices);
  };

  const removeChoice = (index: number) => {
    setChoices(choices.filter((_, i) => i !== index));
  };

  return (
    <div className="border border rounded-lg bg-card p-6">
      <h4 className="text-lg font-semibold text-foreground mb-4">Add New Option</h4>
      <div className="space-y-4">
        {/* Option Type Selection */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Option Type *</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {(Object.keys(OPTION_TYPE_INFO) as OptionType[]).map((type) => {
              const info = OPTION_TYPE_INFO[type];
              const Icon = info.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg transition-all ${
                    formData.type === type
                      ? "border-primary bg-primary/5"
                      : "border hover:border"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium text-center">{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Option Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Option Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Gift Wrapping, Engraving Text, Special Instructions"
            className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description (optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Help text to guide customers"
            rows={2}
            className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Required Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="required"
            checked={formData.required}
            onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
            className="w-4 h-4 text-primary border rounded focus:ring-primary"
          />
          <label htmlFor="required" className="text-sm font-medium text-foreground">
            Required field
          </label>
        </div>

        {/* Choices (for select, radio, checkbox, image_swatch) */}
        {typeInfo.hasChoices && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">Choices *</label>
              <button
                type="button"
                onClick={addChoice}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Choice
              </button>
            </div>
            <div className="space-y-2">
              {choices.map((choice, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={choice.label}
                    onChange={(e) => updateChoice(index, "label", e.target.value)}
                    placeholder="Choice label"
                    className="flex-1 px-3 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={choice.priceModifier / 100}
                      onChange={(e) =>
                        updateChoice(
                          index,
                          "priceModifier",
                          Math.round(parseFloat(e.target.value || "0") * 100)
                        )
                      }
                      placeholder="0.00"
                      className="w-24 px-3 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeChoice(index)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price Modifier (for non-choice types) */}
        {!typeInfo.hasChoices && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Price Modifier (optional)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <input
                type="number"
                step="0.01"
                value={formData.priceModifier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priceModifier: parseFloat(e.target.value || "0"),
                  })
                }
                placeholder="0.00"
                className="w-32 px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="text-sm text-muted-foreground">Additional fee for this option</span>
            </div>
          </div>
        )}

        {/* Placeholder (for text types) */}
        {(formData.type === "text" || formData.type === "textarea") && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Placeholder Text (optional)
            </label>
            <input
              type="text"
              value={formData.placeholder}
              onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
              placeholder="e.g., Enter your message here..."
              className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )}

        {/* Validation Rules */}
        {(formData.type === "text" || formData.type === "textarea") && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Min Length (optional)
              </label>
              <input
                type="number"
                min="0"
                value={formData.minLength || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minLength: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Max Length (optional)
              </label>
              <input
                type="number"
                min="0"
                value={formData.maxLength || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        )}

        {formData.type === "number" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Min Value (optional)
              </label>
              <input
                type="number"
                value={formData.minValue || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minValue: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Max Value (optional)
              </label>
              <input
                type="number"
                value={formData.maxValue || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxValue: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Adding..." : "Add Option"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border text-foreground rounded-lg hover:bg-card transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Option Form Component (similar to Add but with pre-filled data)
function EditOptionForm({
  productId,
  option,
  onCancel,
  onSuccess,
  updateOption,
}: {
  productId: Id<"products">;
  option: ProductOption;
  onCancel: () => void;
  onSuccess: () => void;
  updateOption: any;
}) {
  const [formData, setFormData] = useState({
    name: option.name,
    description: option.description || "",
    required: option.required,
    priceModifier: (option.priceModifier || 0) / 100,
    placeholder: option.placeholder || "",
    minLength: option.minLength,
    maxLength: option.maxLength,
    minValue: option.minValue,
    maxValue: option.maxValue,
  });

  const [choices, setChoices] = useState<Choice[]>(option.choices || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const typeInfo = OPTION_TYPE_INFO[option.type];

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const updates: any = {
        name: formData.name,
        required: formData.required,
      };

      if (formData.description) {
        updates.description = formData.description;
      }

      if (typeInfo.hasChoices) {
        if (choices.length === 0) {
          toast.error("Please add at least one choice for this option type");
          setIsSubmitting(false);
          return;
        }
        updates.choices = choices;
      } else {
        if (formData.priceModifier !== 0) {
          updates.priceModifier = Math.round(formData.priceModifier * 100);
        }
      }

      if (formData.placeholder) {
        updates.placeholder = formData.placeholder;
      }

      if (formData.minLength !== undefined) {
        updates.minLength = formData.minLength;
      }

      if (formData.maxLength !== undefined) {
        updates.maxLength = formData.maxLength;
      }

      if (formData.minValue !== undefined) {
        updates.minValue = formData.minValue;
      }

      if (formData.maxValue !== undefined) {
        updates.maxValue = formData.maxValue;
      }

      await updateOption({ productId, optionId: option.id, updates });
      onSuccess();
    } catch (error) {
      console.error("Failed to update option:", error);
      toast.error("Failed to update option. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addChoice = () => {
    setChoices([...choices, { label: "", priceModifier: 0, default: choices.length === 0 }]);
  };

  const updateChoice = (index: number, field: keyof Choice, value: any) => {
    const newChoices = [...choices];
    newChoices[index] = { ...newChoices[index], [field]: value };
    setChoices(newChoices);
  };

  const removeChoice = (index: number) => {
    setChoices(choices.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-primary rounded-lg bg-card p-6">
      <h4 className="text-lg font-semibold text-foreground mb-4">Edit Option: {option.name}</h4>
      <div className="space-y-4">
        {/* Option Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Option Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description (optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Required Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="edit-required"
            checked={formData.required}
            onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
            className="w-4 h-4 text-primary border rounded focus:ring-primary"
          />
          <label htmlFor="edit-required" className="text-sm font-medium text-foreground">
            Required field
          </label>
        </div>

        {/* Choices (for select, radio, checkbox, image_swatch) */}
        {typeInfo.hasChoices && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">Choices *</label>
              <button
                type="button"
                onClick={addChoice}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Choice
              </button>
            </div>
            <div className="space-y-2">
              {choices.map((choice, index) => (
                <div key={choice.id || index} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={choice.label}
                    onChange={(e) => updateChoice(index, "label", e.target.value)}
                    placeholder="Choice label"
                    className="flex-1 px-3 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={choice.priceModifier / 100}
                      onChange={(e) =>
                        updateChoice(
                          index,
                          "priceModifier",
                          Math.round(parseFloat(e.target.value || "0") * 100)
                        )
                      }
                      placeholder="0.00"
                      className="w-24 px-3 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeChoice(index)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price Modifier (for non-choice types) */}
        {!typeInfo.hasChoices && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Price Modifier (optional)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <input
                type="number"
                step="0.01"
                value={formData.priceModifier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priceModifier: parseFloat(e.target.value || "0"),
                  })
                }
                placeholder="0.00"
                className="w-32 px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Placeholder (for text types) */}
        {(option.type === "text" || option.type === "textarea") && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Placeholder Text (optional)
            </label>
            <input
              type="text"
              value={formData.placeholder}
              onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
              className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )}

        {/* Validation Rules */}
        {(option.type === "text" || option.type === "textarea") && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Min Length (optional)
              </label>
              <input
                type="number"
                min="0"
                value={formData.minLength || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minLength: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Max Length (optional)
              </label>
              <input
                type="number"
                min="0"
                value={formData.maxLength || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        )}

        {option.type === "number" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Min Value (optional)
              </label>
              <input
                type="number"
                value={formData.minValue || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minValue: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Max Value (optional)
              </label>
              <input
                type="number"
                value={formData.maxValue || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxValue: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 border border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border text-foreground rounded-lg hover:bg-card transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
