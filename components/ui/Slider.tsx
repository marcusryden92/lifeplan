"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, onValueChange, onValueCommit, step = 1, ...props }, ref) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(
    props.value || props.defaultValue || [0]
  );

  // Update internal value when external value changes
  React.useEffect(() => {
    if (props.value) {
      setInternalValue(props.value);
    }
  }, [props.value]);

  const handleValueChange = (value: number[]) => {
    setInternalValue(value);
    // Don't call parent onValueChange during drag - only update visual state
  };

  const handleValueCommit = (value: number[]) => {
    setIsDragging(false);
    // On release, snap to nearest step
    const snappedValue = value.map((v) => Math.round(v / step) * step);
    setInternalValue(snappedValue);
    // Only notify parent on commit with snapped value
    if (onValueChange) {
      onValueChange(snappedValue);
    }
    if (onValueCommit) {
      onValueCommit(snappedValue);
    }
  };

  const handlePointerDown = () => {
    setIsDragging(true);
  };

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
      value={internalValue}
      step={isDragging ? 0.1 : step}
      onValueChange={handleValueChange}
      onValueCommit={handleValueCommit}
      onPointerDown={handlePointerDown}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
