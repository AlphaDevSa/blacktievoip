import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import resellerRouter from "./reseller";
import catalogRouter from "./catalog";
import didsRouter from "./dids";
import ordersRouter from "./orders";
import settingsRouter from "./settings";
import storageRouter from "./storage";
import noticesRouter from "./notices";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/admin", settingsRouter);
router.use("/reseller", resellerRouter);
router.use(catalogRouter);
router.use(didsRouter);
router.use(ordersRouter);
router.use(storageRouter);
router.use(noticesRouter);
router.use(reportsRouter);

export default router;
