"use strict";
class unit {
    constructor() {
        this.localtime = false;
    }

    // utc time
    uts() {
        return new Date().toJSON();
    };

    // local time
    lts() {
        const d = new Date();
        const tzoff = d.getTimezoneOffset();
        let res = new Date(d.getTime() - (tzoff * 60000)).toJSON().slice(0, -1);
        let h = -tzoff / 60;
        if (h < 0) {
            h = -h;
            res += "-";
        } else {
            res += "+";
        }
        if (h < 10) {
            res += "0";
        }
        res += h.toString();
        
        let m = tzoff % 60;
        if (m < 0) {
            m = -m;
        }
        if (m < 10) {
            res += "0";
        }
        res += m.toString();
            return res;
    };

    ts() {
        const { localtime } = this;
        return localtime ? this.lts() : this.uts();
    }

    output(stream, format, ...args) {
        stream(this.ts(), format, ...args);
    }

    log(...args) {
        if (console.log) {
            this.output(console.log, "     ", ...args);
        }
    }

    info(...args) {
        if (console.info) {
            this.output(console.info, "(INF)", ...args);
        }
    }

    error(...args) {
        if (console.error) {
            this.output(console.error, "(ERR)", ...args);
        }
    }

    js(value) {
        return JSON.stringify(value);
    }

    dir(path) {
        if (path.slice(-1) != "/") {
            path += "/";
        }
        return path;
    }

    time_diff(ts) {
        return (new Date().getTime() - ts.getTime()) / 1000.0;
    }
};

const u = new unit;
module.exports = u;

