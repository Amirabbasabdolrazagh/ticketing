import { isValidObjectId } from "mongoose";
import Organization from "@/models/organizations";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import { validateSlaPolicy } from "@/lib/slaPolicy.mjs";
import { createSlaAdminHandlers } from "@/lib/slaAdminRoutes.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, PUT } = createSlaAdminHandlers({
  isValidObjectId, Organization, getCurrentUser, connectDb: ConnectDb, validateSlaPolicy,
});
