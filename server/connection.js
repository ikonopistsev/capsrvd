"use strict";

const u = require("../unit");

const chunk_end = '\n\n';
const endl = '\n';

module.exports = class connection {

constructor(ctrl, srv_name, sock, ci) {
    // прием хидера
    this.packet = null;
    // буффер данных, сохраняем в него
    // то что не пропарсилось
    this.prev_buf = null;
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
    // сохраняем количество принятых байт
    this.receive_size = 0;
    // сохраняем время начала приему
    this.timestamp = new Date();

    // отключаем ka
    sock.setKeepAlive(false);

    sock.on("data", (data_buf) => {
        this.on_data(data_buf);
    });

    sock.on("error", (err) => {
        this.on_error(err);
    });

    sock.on("end", () => {
        this.on_close();
    });

    // выставляем таймаут
    sock.setTimeout(3000);
    // и обработчик тайматуа
    sock.on("timeout", () => {
        this.on_error({code: "ETIMEOUT"});
    });

    u.log(srv_name, this.connId, "connect", this.remoteAddress);
}

on_data(data_buf) {
    try {
        this.parse(this.concat(data_buf));
        this.receive_size += data_buf.length;
    } catch (e) {
        this.on_error(e);
    }
}

on_error(err) {
    const { srv_name, connId, remoteAddress, sock, packet, 
        ctrl, receive_size, timestamp } = this;

    u.error(srv_name, connId, remoteAddress, "receive=" + receive_size, 
        "time=" + u.time_diff(timestamp), err, this.time_str());

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
        srv_name, receive_size, timestamp } = this;
    
    sock.destroy();

    if (packet) {
        // завершаем прием
        packet.set_ready(true);
        // уведомляем об этом контроллер
        ctrl.receive();
    }

    u.log(srv_name, connId, "close", remoteAddress, 
        "receive=" + receive_size, "time=" + u.time_diff(timestamp) );
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
        sock.remoteAddress + ":" + sock.remotePort;
}

concat(data_buf) {
    const { prev_buf } = this;
    const result = (prev_buf) ? 
        Buffer.concat([prev_buf, data_buf]) : data_buf;
    this.prev_buf = null;
    return result;
}

parse(data_buf) {
    //u.log("parse");
    const { sock, srv_name, remoteAddress } = this;

    let t = 0;
    let i = data_buf.indexOf(chunk_end, t);

    while (-1 != i) {
        this.parse_chunk(data_buf.slice(t, i));
        t = i + 2;
        i = data_buf.indexOf(chunk_end, t);
    }

    if (t != data_buf.length) {
        this.prev_buf = data_buf.slice(t);
    }
}

parse_chunk(data_buf) {
    //u.log("parse_chunk");
    const { packet } = this;
    // приняли ли хидер
    if (packet) {
        this.parse_data(data_buf);
    } else {
        this.parse_header(data_buf.toString());
    }
}

parse_header(header_str) {
    //u.log("parse_header");
    const param_arr = header_str.split(" ");
    if (param_arr.length > 2) {
        // парсим время
        param_arr[0] = parseInt(param_arr[0]);
        this.receive_header(param_arr);
    } else {
        // ошибка разбора хидера
        throw { code: 100500, error: "bad header" };
    }
}

parse_data(data_buf) {
    const { srv_name, connId, remoteAddress } = this;

    if (data_buf.length) {
        const { packet } = this;
        let reuslt_arr = [];
        let t = 0;
        let i = data_buf.indexOf(endl, t);

        if (-1 == i) {
            // в пакете только даныне
            JSON.parse(data_buf);
            reuslt_arr.push(data_buf);
        } else {
            // в пакете еще и маршруты
            while (-1 != i) {
                let line = data_buf.slice(t, i);
                if (t == 0) {
                    JSON.parse(line);
                    reuslt_arr.push(line);
                } else {
                    reuslt_arr.push(this.parse_route(line.toString()));
                }

                t = i + 1;
                i = data_buf.indexOf(endl, t);
            }

            // добавляем крайний маршрут
            if (t != 0) {
                reuslt_arr.push(this.parse_route(data_buf.slice(t).toString()));
            }
        }

        if (reuslt_arr.length) {
            u.log(srv_name, connId, "chunk", reuslt_arr.toString());
            packet.push_back(reuslt_arr);
        }

    } else {        
        // ошибка пакета
        throw { code: 100500, error: "bad data" };
    }
}

make_route_kv(json) {
    //u.log("make_route_kv");
    let result = "";
    for (const i in json) {
        result += ".";
        result += i;
        result += "=";
        result += json[i];
    }
    return result;
}

parse_route(route_str) {
    if (route_str.charAt(0) == "{") {
        return this.make_route_kv(JSON.parse(route_str));
    }
    return "." + route_str;
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

receive_header(param_arr) {
    //u.log("receive_header", param);
    const { srv_name, connId, ctrl } = this;
    // создаем новый пакет
    u.log(srv_name, connId, u.js(param_arr));
    this.packet = ctrl.new_packet(param_arr, connId);
}

}