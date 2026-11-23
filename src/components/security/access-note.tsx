import { noteAccess, type AccessAction } from "@/server/services/access";

export async function AccessNote({
  action,
  game,
}: {
  action: AccessAction;
  game?: string;
}) {
  await noteAccess(action, { game });
  return null;
}
