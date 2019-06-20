"use strict";

const u = require("./unit");
const amqp = require("./rabbit");
const server = require("./server");
const fs = require("fs");


module.exports = class app {
    constructor(conf) {
        this.amqp = this.init_amqp(conf["#amqp"]);
        this.server = this.init_server(conf.server);
    }


    init_amqp(conf) {
        return new amqp(conf);
    }

    init_server(conf) {
        return new server(this, conf);
    }

    channel(conn_name) {
        const { amqp } = this;
        return amqp.get(conn_name);
    }

    run() {
        const { amqp, server } = this;
        amqp.run();
        server.run();
    }
};