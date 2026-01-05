"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckSquare, Square } from "lucide-react";

export interface ProductOptionChoice {
  id: string;
  label: string;
  priceModifier: number;
  image?: string;
  default?: boolean;
}

export interface ProductOption {
  id: string;
  name: string;
  description?: string;
  type:
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
  required: boolean;
  choices?: ProductOptionChoice[];
  priceModifier?: number;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  placeholder?: string;
  displayOrder: number;
}

export interface SelectedOption {
  optionId: string;
  optionName: string;
  type: ProductOption["type"];
  value?: string | number | string[];
  priceModifier: number;
  selectedChoices?: Array<{
    id: string;
    label: string;
    priceModifier: number;
  }>;
}

interface ProductOptionInputProps {
  option: ProductOption;
  value: SelectedOption | undefined;
  onChange: (selectedOption: SelectedOption | undefined) => void;
}

export default function ProductOptionInput({ option, value, onChange }: ProductOptionInputProps) {
  // Helper to calculate price modifier based on current selection
  const calculatePriceModifier = (
    optionType: string,
    textValue?: string | number,
    selectedChoiceIds?: string[]
  ): number => {
    if (option.type === "checkbox" && selectedChoiceIds && option.choices) {
      // For checkboxes, sum all selected choice price modifiers
      return option.choices
        .filter((choice) => selectedChoiceIds.includes(choice.id))
        .reduce((sum, choice) => sum + choice.priceModifier, 0);
    } else if (selectedChoiceIds && selectedChoiceIds.length > 0 && option.choices) {
      // For single-choice options (select, radio, image_swatch)
      const selectedChoice = option.choices.find((choice) => choice.id === selectedChoiceIds[0]);
      return selectedChoice?.priceModifier || 0;
    } else if (
      (option.type === "text" ||
        option.type === "textarea" ||
        option.type === "number" ||
        option.type === "file" ||
        option.type === "color" ||
        option.type === "date") &&
      textValue
    ) {
      // For text/number/file/etc types with a value, use the option's flat priceModifier
      return option.priceModifier || 0;
    }
    return 0;
  };

  // Handle text input changes
  const handleTextChange = (newValue: string) => {
    if (!newValue) {
      onChange(undefined);
      return;
    }

    onChange({
      optionId: option.id,
      optionName: option.name,
      type: option.type,
      value: newValue,
      priceModifier: calculatePriceModifier(option.type, newValue),
    });
  };

  // Handle number input changes
  const handleNumberChange = (newValue: number) => {
    onChange({
      optionId: option.id,
      optionName: option.name,
      type: option.type,
      value: newValue,
      priceModifier: calculatePriceModifier(option.type, newValue),
    });
  };

  // Handle single choice selection (select, radio, image_swatch)
  const handleSingleChoiceChange = (choiceId: string) => {
    const selectedChoice = option.choices?.find((c) => c.id === choiceId);
    if (!selectedChoice) return;

    onChange({
      optionId: option.id,
      optionName: option.name,
      type: option.type,
      value: choiceId,
      priceModifier: selectedChoice.priceModifier,
      selectedChoices: [
        {
          id: selectedChoice.id,
          label: selectedChoice.label,
          priceModifier: selectedChoice.priceModifier,
        },
      ],
    });
  };

  // Handle checkbox (multiple choice) selection
  const handleCheckboxChange = (choiceId: string, checked: boolean) => {
    const currentValues = (value?.value as string[]) || [];
    const newValues = checked
      ? [...currentValues, choiceId]
      : currentValues.filter((id) => id !== choiceId);

    if (newValues.length === 0) {
      onChange(undefined);
      return;
    }

    const selectedChoices = option.choices
      ?.filter((choice) => newValues.includes(choice.id))
      .map((choice) => ({
        id: choice.id,
        label: choice.label,
        priceModifier: choice.priceModifier,
      }));

    onChange({
      optionId: option.id,
      optionName: option.name,
      type: option.type,
      value: newValues,
      priceModifier: calculatePriceModifier(option.type, undefined, newValues),
      selectedChoices,
    });
  };

  // Render based on option type
  return (
    <div className="space-y-3">
      {/* Label and Description */}
      <div>
        <label className="block text-sm font-medium text-foreground">
          {option.name}
          {option.required && <span className="text-destructive ml-1">*</span>}
        </label>
        {option.description && <p className="text-sm text-muted-foreground mt-1">{option.description}</p>}
      </div>

      {/* Input Based on Type */}
      {option.type === "text" && (
        <input
          type="text"
          required={option.required}
          value={(value?.value as string) || ""}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={option.placeholder}
          minLength={option.minLength}
          maxLength={option.maxLength}
          className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      )}

      {option.type === "textarea" && (
        <textarea
          required={option.required}
          value={(value?.value as string) || ""}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={option.placeholder}
          minLength={option.minLength}
          maxLength={option.maxLength}
          rows={4}
          className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      )}

      {option.type === "number" && (
        <input
          type="number"
          required={option.required}
          value={(value?.value as number) || ""}
          onChange={(e) => handleNumberChange(parseFloat(e.target.value) || 0)}
          placeholder={option.placeholder}
          min={option.minValue}
          max={option.maxValue}
          className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      )}

      {option.type === "select" && option.choices && (
        <select
          required={option.required}
          value={(value?.value as string) || ""}
          onChange={(e) => handleSingleChoiceChange(e.target.value)}
          className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">-- Select an option --</option>
          {option.choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
              {choice.priceModifier !== 0 &&
                ` (${choice.priceModifier >= 0 ? "+" : ""}$${(choice.priceModifier / 100).toFixed(
                  2
                )})`}
            </option>
          ))}
        </select>
      )}

      {option.type === "radio" && option.choices && (
        <div className="space-y-2">
          {option.choices.map((choice) => (
            <label
              key={choice.id}
              className="flex items-center gap-3 p-3 border border-input rounded-lg cursor-pointer hover:bg-background transition-colors"
            >
              <input
                type="radio"
                name={option.id}
                required={option.required}
                value={choice.id}
                checked={(value?.value as string) === choice.id}
                onChange={(e) => handleSingleChoiceChange(e.target.value)}
                className="w-4 h-4 text-primary border-input focus:ring-primary"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">{choice.label}</span>
                {choice.priceModifier !== 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    {choice.priceModifier >= 0 ? "+" : ""}${(choice.priceModifier / 100).toFixed(2)}
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>
      )}

      {option.type === "checkbox" && option.choices && (
        <div className="space-y-2">
          {option.choices.map((choice) => {
            const isChecked = ((value?.value as string[]) || []).includes(choice.id);
            return (
              <label
                key={choice.id}
                className="flex items-center gap-3 p-3 border border-input rounded-lg cursor-pointer hover:bg-background transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => handleCheckboxChange(choice.id, e.target.checked)}
                  className="w-4 h-4 text-primary border-input rounded focus:ring-primary"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">{choice.label}</span>
                  {choice.priceModifier !== 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      {choice.priceModifier >= 0 ? "+" : ""}$
                      {(choice.priceModifier / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {option.type === "image_swatch" && option.choices && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {option.choices.map((choice) => {
            const isSelected = (value?.value as string) === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleSingleChoiceChange(choice.id)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-input hover:border-border"
                }`}
              >
                {choice.image ? (
                  <Image src={choice.image} alt={choice.label} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <span className="text-xs text-muted-foreground text-center p-2">{choice.label}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-foreground/60 text-background p-2">
                  <p className="text-xs font-medium truncate">{choice.label}</p>
                  {choice.priceModifier !== 0 && (
                    <p className="text-xs">
                      {choice.priceModifier >= 0 ? "+" : ""}$
                      {(choice.priceModifier / 100).toFixed(2)}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {option.type === "color" && (
        <input
          type="color"
          required={option.required}
          value={(value?.value as string) || "#000000"}
          onChange={(e) => handleTextChange(e.target.value)}
          className="h-12 w-full rounded-lg border border-input cursor-pointer"
        />
      )}

      {option.type === "date" && (
        <input
          type="date"
          required={option.required}
          value={(value?.value as string) || ""}
          onChange={(e) => handleTextChange(e.target.value)}
          className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      )}

      {option.type === "file" && (
        <div>
          <input
            type="file"
            required={option.required}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleTextChange(file.name);
              }
            }}
            className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Note: File uploads will be handled during checkout
          </p>
        </div>
      )}

      {/* Price Modifier Display */}
      {value && value.priceModifier !== 0 && (
        <div className="text-sm text-primary font-medium">
          {value.priceModifier >= 0 ? "+" : ""}${(value.priceModifier / 100).toFixed(2)}
        </div>
      )}
    </div>
  );
}
