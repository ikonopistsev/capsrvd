const u = require("../unit");
const connection = require("./connection.js");

module.exports = class controller {

constructor(conf) { 
    let pool = {};
    for (const conn_name in conf) {
        pool[conn_name] = new connection(conn_name, conf[conn_name]);
    }

    this.pool = pool;
}

get(conn_name) {
    const { pool } = this;
    return pool[conn_name];
}

run() {
    const { pool } = this;
    for (const c in pool)
        pool[c].run();
}

}
