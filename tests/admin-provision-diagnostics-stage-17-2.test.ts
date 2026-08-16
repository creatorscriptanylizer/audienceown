import {describe,expect,it} from "vitest";
import {adminProvisionErrorCategory} from "@/lib/app-admin";

describe("admin provisioning diagnostics",()=>{
  it.each([
    [{code:"PGRST202"},"rpc_or_function_missing"],
    [{code:"42883"},"rpc_or_function_missing"],
    [{code:"42501",message:"permission denied"},"permission_denied"],
    [{code:"42501",message:"new row violates row-level security policy"},"rls_rejection"],
    [{code:"22P02"},"malformed_rpc_arguments"],
    [{code:"23505"},"existing_row_conflict"],
    [{code:"23503"},"app_admins_insertion_failure"],
    [{code:"42703"},"database_schema_mismatch"],
    [{code:"XX000"},"unexpected_supabase_postgrest_error"],
  ])("classifies %j as %s",(error,category)=>{
    expect(adminProvisionErrorCategory(error)).toBe(category);
  });
});
