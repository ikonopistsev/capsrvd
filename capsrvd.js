#!/usr/bin/node

"use strict";

const fs = require("fs");
const u = require("./unit");
const app = require("./app.js");
const version = "capsrvd v2.0.0"
const confpath = "/etc/capsrvd/capsrvd.conf.json";

const test_log = (path) => {
    const fd = fs.openSync(path, "a+");
    if (fd) {
       fs.closeSync(fd);
    }
}

const parse = (args)=> {
    let path = "";
    if (args.length > 0) {
        if ((args.length != 2) || (args[0] != "-c")) {
           throw "no config, use: -c config.json"
        }

        path = args[1];
    } else {
        path = confpath;
    }

    return JSON.parse(fs.readFileSync(path, "utf8"));
}

try {
    const args = process.argv.slice(2);
    const theapp = new app(parse(args));

    process.on("uncaughtException", err => {
        u.error("uex", err);
    }); 

    theapp.run();
} catch (e) {
    u.error(e);
}

