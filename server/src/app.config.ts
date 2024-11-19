import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { Server } from "colyseus";
import path from "path";
import express from "express";
/**
 * Import your Room files
 */
import { Part4Room } from "./rooms/Part4Room";

let gameServerRef: Server;
let latencySimulationMs: number = 0;

export default config({
    options: {
        devMode: false,
    },

    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
        gameServer.define('game', Part4Room);

        //
        // keep gameServer reference, so we can
        // call `.simulateLatency()` later through an http route
        //
        gameServerRef = gameServer;
    },

    initializeExpress: (app) => {

        if (process.env.NODE_ENV === "production") {
            app.use("/", express.static(path.join(__dirname, "client")));
        }

        /**
         * Bind @colyseus/monitor
         * It is recommended to protect this route with a password.
         * Read more: https://docs.colyseus.io/tools/monitor/
         */
        app.use("/colyseus", monitor());
    },


    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    }
});
