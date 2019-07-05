#!/usr/bin/node

"use strict";

const fs = require("fs");
const intel = require("intel");
const u = require("./unit");
const app = require("./app.js");

const parse = (args)=> {
    // читаем путь
    let path = __filename;
    if (args.length != 1) {
        // заменяем окончание
        path = path.substr(0, path.lastIndexOf(".")) + ".conf.json";
    } else {
        // если указан путь дописываем к нему файл конфига
        let fname = path.substr(path.lastIndexOf("/") + 1);
        fname = fname.substr(0, fname.lastIndexOf("."));
        path = u.dir(args[0]) + fname + ".conf.json";
    }
    // парсим конфиг
    let conf = JSON.parse(fs.readFileSync(path, "utf8"));
    if (conf.LogFile) {
        intel.addHandler(new intel.handlers.File(conf.LogFile));
        intel.console();
        const develop = conf.Develop;
        if (!develop) {
            intel.setLevel(intel.INFO);
        }

        process.on("SIGHUP", ()=>{
            intel.removeAllHandlers();
            intel.addHandler(new intel.handlers.File(conf.LogFile));
            intel.console();
            if (!develop) {
                intel.setLevel(intel.INFO);
            }
        });
    }
    return conf;
}

try {
    const args = process.argv.slice(2);
    const theapp = new app(parse(args));
    theapp.run();
} catch (e) {
    u.error(e);
}

