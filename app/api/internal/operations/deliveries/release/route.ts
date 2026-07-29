import { handleOperatorMutation } from "@/lib/delivery-operations-api";
export async function POST(request: Request) {
  return handleOperatorMutation(request, "release");
}
