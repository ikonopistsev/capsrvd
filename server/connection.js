"use strict";

const u = require("../unit");

// [1576330299387,
const minimum_header_size = 15;


module.exports = class connection {

constructor(ctrl, srv_name, sock, ci) {
    // прием хидера
    this.packet = null;
    // буффер данных, сохраняем в него
    // то что не пропарсилось
    this.recv_buf = Buffer.alloc(0);
    // сохраняем сокет
    this.sock = sock;
    // время подключения
    this.conn_time = new Date();
    // сохраняем имя сервера
    this.srv_name = srv_name;
    // сохраняем ссылку на контроллер
    this.ctrl = ctrl;
    // сохраняем id коннекта
    this.ci = ci;
    // сохраняем время начала приема
    this.recv_time = null;

    sock.on("data", (chunk_buf) => {
        this.on_data(chunk_buf);
    });

    sock.on("error", (err) => {
        this.on_error(err);
    });

    sock.on("end", () => {
        this.on_close();
    });

    // выставляем таймаут
    sock.setTimeout(600000);
    //sock.setRecvBufferSize(1048576);
    // и обработчик тайматуа
    sock.on("timeout", () => {
        this.on_error({code: "ETIMEOUT"});
    });

    u.trace(output => {
        output(srv_name, this.connId, "connect", this.remoteAddress);
    });
}

on_data(chunk_buf) {
    try {
        const { recv_time } = this;
        if (!recv_time) {
            this.recv_time = new Date();
        }
        this.concat(chunk_buf);
        this.parse();
    } catch (e) {
        this.on_error(e);
    }
}

on_error(err) {
    const { srv_name, connId, remoteAddress, sock, packet, 
        ctrl, recv_time, recv_buf } = this;
    const { length } = recv_buf;

    u.error(srv_name, connId, remoteAddress, "receive=" + length, 
        "time=" + u.time_diff(recv_time), err, this.time_str());

    sock.destroy();

    if (packet) {
        // завершаем прием
        packet.set_error(true);
        // уведомляем об этом контроллер
        ctrl.receive();
    }
}

on_close() {
    const { sock, ctrl, packet, connId, remoteAddress, 
        srv_name, recv_buf, recv_time } = this;
    const { length } = recv_buf;
    
    try {
        if (packet) {
            // завершаем прием
            packet.receive(recv_buf);
            // уведомляем об этом контроллер
            ctrl.receive();
        }

        u.trace(output => {
            output(srv_name, connId, "close", remoteAddress,
                "receive=" + length, "time=" + u.time_diff(recv_time));
        });
    
        sock.destroy();
    } catch (err) {
        this.on_error(err);
    }
}

get connId() {
    return "id=" + this.ci;
}

get remoteAddressLocal() {
    const { sock } = this;
    const { remoteAddress } = sock;
    return remoteAddress === "127.0.0.1" || 
        remoteAddress === "::ffff:127.0.0.1" || remoteAddress === "::1";
}

get remoteAddress() {
    const { sock, remoteAddressLocal,  } = this;
    const port_name = "remotePort:" + sock.remotePort;
    return (remoteAddressLocal) ? port_name:
        sock.remoteAddress + ":" + sock.remotePport;
}

concat(chunk_buf) {
    const { recv_buf } = this;
    this.recv_buf = (recv_buf) ? 
        Buffer.concat([recv_buf, chunk_buf]) : chunk_buf;
}

parse() {
    const { sock, srv_name, remoteAddress, packet, recv_buf } = this;    
    const { length } = recv_buf;
    
    // проверяем приняли ли хидер
    // если хидер не приняли, провреяем пришло ли нужное количество байт
    // первый параметр в протоколе timestamp
    if (!packet && (length >= minimum_header_size)) {
        // вырезаем начало буфера с таймстампом
        const header_str = recv_buf.slice(0, minimum_header_size).toString();

        // проверяем что внутри таймстамп
        if (!((header_str[0] == '[') && 
            (header_str[minimum_header_size - 1] == ','))) {
            throw { code: 100500, error: "bad header" };
        }

        const time_str = header_str.slice(1, minimum_header_size - 1);
        const timestamp = parseInt(time_str);

        if (!timestamp || timestamp < 1) {
            throw { code: 100500, error: "bad header" };
        }

        this.create_packet(timestamp);
    }
}

// длительность подключения
time() {
    const { conn_time } = this;
    const curr = new Date().getTime();
    const conn = conn_time.getTime();
    return curr - conn;
}

time_str() {
    return this.time() / 1000.0 + "sec";
}

create_packet(timestamp) {
    const { srv_name, connId, ctrl } = this;
    // создаем новый пакет
    u.trace(output => {
        output(srv_name, connId, timestamp);
    });
    this.packet = ctrl.new_packet(timestamp, connId);
}

}