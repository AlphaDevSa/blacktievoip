import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes";

const PgStore = connectPgSimple(session);

const app: Express = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "blacktie-voip-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/api", router);

if (!isProduction) {
  const { createProxyMiddleware } = await import("http-proxy-middleware");
  const vitePort = process.env.VITE_PORT || "5000";
  const viteTarget = `http://localhost:${vitePort}`;
  app.use(
    createProxyMiddleware({
      target: viteTarget,
      changeOrigin: true,
      ws: true,
    })
  );
}

export default app;
