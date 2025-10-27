"use client";

import { Icons } from "@/components/ui/icons";
import { useState } from "react";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <button
      type="button"
      className="md:hidden p-2"
      onClick={() => setIsOpen(!isOpen)}
    >
      <Icons.Menu size={24} />
    </button>
  );
}
