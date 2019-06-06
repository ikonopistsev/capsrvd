"use strict";

const u = require("../unit");
const controller = require("./controller.js")

module.exports = class server {

constructor(ctrl, conf) {   
    let pool = [];

    for (const srv_name in conf) {
        if (srv_name[0] == '#')
            continue;
        const { listen } = conf[srv_name];
        if (!listen) {
            throw { code: 100500, error: "empty listen"};
        }
        // получаем очередь на которую ссылаемся
        const { amqp } = conf[srv_name];
        const channel = ctrl.channel(amqp);
        if (!channel) {
            const text = amqp + " not found";
            throw { code: 100500, error: text };
        }
        // создаем контроллер с очередью
        const server = new controller(channel, srv_name, listen);
        channel.set_server(server);
        pool.push(server);
    }

    if (pool.length < 1)
        throw { code: 100500, error: "no server"}; 

    this.pool = pool;
}

run() {
    const { pool } = this;
    for (const srv of pool)
        srv.run();
}

}
