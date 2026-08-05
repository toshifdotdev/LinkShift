import { Response } from "express";
import { config } from "../config";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export const setRefreshCookie = (res : Response, refreshToken : string) => {
    res.cookie("refreshToken", refreshToken, {
        httpOnly : true,
        secure : config.node_env === "production",
        sameSite : "lax",
        maxAge : THIRTY_DAYS
    })
}