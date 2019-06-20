"use strict";

const u = require("../unit");
const conn = require("./connection.js");
const packet = require("./packet.js");
const net = require("net");

module.exports = class controller {

constructor(amqp, srv_name, conf) { 
    this.conn_id = 0;

    const server = net.createServer((sock) => {
        new conn(this, srv_name, sock, ++this.conn_id);
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
    this.retry = null;
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

new_packet(param_arr, conn_id) {
    const { packet_arr } = this;
    const result = new packet(param_arr, conn_id);
    packet_arr.push(result);
    // сортировку пока не будем делать, но она возможна
    // коннекты принимаются по очереди
    //packet_arr.sort(dynamic_sort("timestamp"));
    return result;
}

// событие окончания прием пакета
receive() {
    const { retry } = this;
    // требуется ли повторная перепроверка
    if (retry) {
        clearImmediate(retry);
        this.retry = null;
    }        

    // определяем есть ли данные для рассылки
    const { amqp, srv_name, packet_arr } = this;
    while (packet_arr.length) {
        let p = packet_arr[0];
        if (p.ready) {
            // если пакет готов пытаемся его разослать
            if (!amqp.publish(p)) {
                // если не разослали выходим без перепроведения
                u.error(srv_name, "->", amqp.conn_name, "publish", p.toString());
                break;
            } else {
                // удаляем обработанный пакет
                packet_arr.shift();
            }
        } else if (p.error) {
            // говорим что пакет с ошибкой
            u.error(srv_name, "bad", p.toString());
            // пропускаем его переходим к следующему
            packet_arr.shift();
        } else {
            // иначе пакет просто не принят
            // запускаем повторную рассылку
            this.retry = setImmediate(()=>{
                this.receive();
            });
            // выходим
            break;
        }
    }
}

}