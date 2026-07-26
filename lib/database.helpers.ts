import type { Database } from "@/lib/database.types";

export type Creator =
  Database["public"]["Tables"]["creators"]["Row"];

export type CreatorInsert =
  Database["public"]["Tables"]["creators"]["Insert"];

export type CreatorUpdate =
  Database["public"]["Tables"]["creators"]["Update"];
