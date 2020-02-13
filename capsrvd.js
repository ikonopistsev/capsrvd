#!/usr/bin/node

"use strict";

const fs = require("fs");
const u = require("./unit");
const app = require("./app.js");
const pkg = require("./package.json");
const confpath = "/etc/capsrvd/capsrvd.conf.json";
const pkg = require("./package.json");


const parse = (args)=> {
    let path = "";
    if (args.length > 0) {
        if ((args.length != 2) || (args[0] != "-c")) {
           throw "no config, use: -c config.json";
        }
        path = args[1];
    } else {
        path = confpath;
    }

    const conf = JSON.parse(fs.readFileSync(path, "utf8"));
    u.verbose = conf.verbose;
    return conf;
}

try {
    u.localtime = true;
    u.log(pkg.name + "-" + pkg.version + "-r" + pkg.revision);

    const args = process.argv.slice(2);
    const theapp = new app(parse(args));

    process.on("uncaughtException", err => {
        u.error("uex", err);
    }); 

    theapp.run();
} catch (e) {
    u.error(e);
}

