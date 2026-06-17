"use client";
import { useState } from "react";

/** Placeholder mobile menu — wired up in the design phase. */
export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <button className="sm:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
      {open ? "Close" : "Menu"}
    </button>
  );
}
