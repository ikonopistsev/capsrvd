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
    let log_options = { file: conf.LogFile };
    if (conf.LogFile) {
        intel.addHandler(new intel.handlers.File(log_options));
        intel.console();
        if (!conf.Develop) {
            intel.setLevel(intel.INFO);
        }

        process.on("SIGHUP", ()=>{
            u.info(JSON.stringify(log_options));

            intel.removeAllHandlers();
            if (log_options.stream != null)
            {
                log_options.stream.close();
                log_options = { file: conf.LogFile };
            }
            intel.addHandler(new intel.handlers.File(log_options));
            intel.console();
        });
    }
    return conf;
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

