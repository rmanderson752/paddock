"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-faint" size={16} />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search make, model, generation..."
        className="w-full rounded-[10px] border-[0.5px] border-surface-border bg-surface py-2.5 pl-10 pr-4 text-sm text-sand placeholder:text-sand-faint outline-none transition-colors focus:border-surface-border-hover"
      />
    </form>
  );
}
