import serverless from "serverless-http";
import app from "./app";
import prisma from "./config/prisma";

const http = serverless(app);

type KeepAliveEvent = { keepAlive: true };

const isKeepAlive = (event: unknown): event is KeepAliveEvent =>
  typeof event === "object" && event !== null && (event as KeepAliveEvent).keepAlive === true;

// EventBridge Scheduler invoca con { keepAlive: true } para evitar que Supabase pause el proyecto.
export const handler = async (event: any, context: any) => {
  if (isKeepAlive(event)) {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  }
  return http(event, context);
};
