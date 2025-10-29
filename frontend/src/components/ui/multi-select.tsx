
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { Badge } from "@/components/ui/badge";

const multiSelectVariants = cva(
  "m-1 transition-all duration-100 ease-in-out",
  {
    variants: {
      variant: {
        default:
          "border-foreground/10 text-foreground bg-card hover:bg-card/80",
        secondary:
          "border-secondary/10 text-secondary bg-secondary/10 hover:bg-secondary/20",
        destructive:
          "border-destructive/10 text-destructive bg-destructive/10 hover:bg-destructive/20",
        inverted: "inverted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface MultiSelectProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof multiSelectVariants> {
  placeholder?: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  value: string[];
  onChange: (value: string[]) => void;
}

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    {
      className,
      variant,
      placeholder = "Select options",
      options,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    const handleSelect = (selectedValue: string) => {
      onChange(
        value.includes(selectedValue)
          ? value.filter((v) => v !== selectedValue)
          : [...value, selectedValue]
      );
      setInputValue("");
    };

    const handleRemove = (selectedValue: string) => {
      onChange(value.filter((v) => v !== selectedValue));
    };

    const filteredOptions = options.filter((option) =>
      option.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
      <Command
        className={cn(
          "overflow-visible bg-transparent w-full",
          className
        )}
      >
        <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <div className="flex flex-wrap gap-1">
            {value.map((val) => {
              const option = options.find((opt) => opt.value === val);
              return (
                <Badge
                  key={val}
                  className={cn(multiSelectVariants({ variant }))}
                >
                  {option?.label}
                  <button
                    className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onClick={() => handleRemove(val)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              );
            })}
            <CommandPrimitive.Input
              placeholder={placeholder}
              className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              value={inputValue}
              onValueChange={setInputValue}
              onBlur={() => setOpen(false)}
              onFocus={() => setOpen(true)}
            />
          </div>
        </div>
        <div className="relative mt-2">
          {open && filteredOptions.length > 0 ? (
            <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandList>
                <CommandGroup>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => handleSelect(option.value)}
                      className={"cursor-pointer"}
                    >
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </div>
          ) : null}
        </div>
      </Command>
    );
  }
);

MultiSelect.displayName = "MultiSelect";

export { MultiSelect };
