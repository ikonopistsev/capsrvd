"use strict";

const u = require("../unit");
const conn = require("./connection.js");
const packet = require("./packet.js");
const net = require("net");

module.exports = class controller {

constructor(amqp, srv_name, conf) { 
    const server = net.createServer((sock) => {
        new conn(this, srv_name, sock);
    });

    server.on("error", (e) => {
        u.error("server", e.code);
    });

    u.log("server", srv_name, "ok");

    this.packet_arr = [];

    this.amqp = amqp;
    this.srv_name = srv_name;
    this.conf = conf;

    this.server = server;
}

run() {
    const { server, conf, srv_name } = this;
    const { host, port } = conf;

    if (host) {
       server.listen(port, host, () => {
            u.log(srv_name, "run " + host + ":" + port);
        });
    } else {
        server.listen(port, () => {
            u.log(srv_name, "run *:" + port);
        });
    }
}

new_packet(param_arr) {
    const { packet_arr } = this;
    const result = new packet(param_arr);
    packet_arr.push(result);
    // сортировку пока не будем делать, но она возможна
    // коннекты принимаются по очереди
    //packet_arr.sort(dynamic_sort("timestamp"));
    return result;
}

// событие окончания прием пакета
receive() {
    const { packet_arr, amqp, srv_name } = this;
    let p = packet_arr.shift();
    while (p) {
        if (p.ready) {
            if (!amqp.publish(p)) {
                u.error(srv_name, "->", amqp.conn_name);
                break;
            } else {
                //u.log(srv_name, "->", amqp.conn_name);
            }
        } else if (!p.error) {
            break;
        }
        p = packet_arr.shift();
    }
}

}

const dynamic_sort = (property) => {
    const sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return (a, b) => {
        const result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}
