"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AccountFiltersProps = {
  search: string;
  role: string;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AccountFilters({ search, role, onSearchChange, onRoleChange, onSubmit }: AccountFiltersProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Cari nama, email, atau username..."
      />
      <Select value={role} onValueChange={onRoleChange}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="Semua role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua role</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="judge">Juri</SelectItem>
          <SelectItem value="team">Peserta</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" variant="outline">
        Cari
      </Button>
    </form>
  );
}
