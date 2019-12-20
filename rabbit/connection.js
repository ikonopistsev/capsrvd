const amqp = require("amqplib");
const u = require("../unit");

const delay_step = 1000;
const max_delay = 10000;

module.exports = class connection {

// документация отсюда
// http://www.squaremobius.net/amqp.node/channel_api.html

constructor(conn_name, conf) {
    const url = conf.url;
    if (!url) {
        throw { code: 100500, error: "empty url"};
    }
    this.delivery_mode = conf.delivery_mode;
    this.conn_name = "@" + conn_name;   
    this.url = url;
    this.delay = 0;
    this.message_id = 0;
    this.timestamp = null;
    this.server = null;
    this.prev_time = null;
    this.prev_conn_id = null;
}

set_server(srv) {
    this.server = srv;
}

receive() {
    const { server } = this;
    if (server)
        server.receive();
}


// метод увиеличивает таймаут переподключения
// при неудачной попытке соединение на 1сек
reconnect_timeout() {
    let { delay } = this;
    // выставляем таймауты переподключения
    delay += delay_step;
    if (delay > max_delay) {
        delay = max_delay;
    }
    this.delay = delay;
    return delay;
}

run() {
    const { conn_name, url } = this;
    let delay = this.reconnect_timeout();

    amqp.connect(url, { noDelay: true })
        .then(conn => {
            // сбрасываем обработчки тайматуа
            this.delay = delay = 0;
            // в начале вызываетя обработчик ошибки
            // служед для логирования
            conn.on("error", err => {
                u.error(conn_name, "conn", err.errno);
            });
            // затем обработчик закрытия
            // обработчик закрытия соединения
            conn.on("close", () => {
                u.error(conn_name, "conn", "close");
                // удаляем канал
                this.channel = null;
                // переподключаемся
                setTimeout(() => {
                    this.run();
                }, delay);
            });

            u.log("connect", conn_name, "ok");
            conn.createChannel()
                .then(ch => {
                    // в документации есть
                    // ни разу не вызывалась
                    ch.on("error", err => {
                        u.error(conn_name, "ch", err);
                        conn.close();
                    });
                    // вызыватеся когда закрыватся канал либо соединение
                    // закрыть получилось только собственные каналы
                    ch.on("close", () => {
                        u.error(conn_name, "ch", "close");
                        conn.close();
                    });

                    u.log(conn_name, "ch", "ok");

                    // сохраняем канал для отправки
                    this.channel = ch;
                    // вызываем обработчик приема
                    this.receive();
                })
                .catch(err => {
                    u.error(conn_name, "ch", err);
                    conn.close();
                });
        })
        .catch(err => {
                if (err.code) {
            	    let text = err.code;
            	    if (err.syscall) {
            		text += " " + err.syscall;
            	    }
            	    
            	    if (err.address) {
            		text += " " + err.address;
            	    }
            	    
                    u.error(conn_name, text);
                } else {
                    u.error(conn_name, "connect error");
                }
                this.channel = null;
            setTimeout(() => {
                this.run();
            }, delay);
        });
}

pub_opt(packet) {
    let res = {};
    const { timestamp } = packet;
    if (timestamp) {
        res.timestamp = timestamp;
    }
    res.delivery_mode = this.delivery_mode;
    res.messageId = (++this.message_id).toString();
    res.contentType = "application/json";
    return res;
}

check_timestamp(curr, connId) {
    const { prev_time, prev_conn_id } = this;
    if (prev_time) {
        if (curr < prev_time) {
            u.error("packet", "prev", prev_conn_id, prev_time, "curr", connId, curr);
        }
    }

    this.prev_time = curr;
    this.prev_conn_id = connId;
}


// рассылаем пакеты с флагом ready=true
publish(packet) {
    const { connId } = packet;
    const { conn_name, channel } = this;
    if (channel) {
        const { data_arr, method, exchange, timestamp } = packet;
        // формируем параметры
        const option = this.pub_opt(packet);
        let exch = (exchange) ? exchange : null;

        // проверяем последовательность таймстампов
        this.check_timestamp(timestamp, connId);

        for (const packet_arr of data_arr) {
            const message = {
                // метод и данные должны быть всегда
                method: method,
                payload: packet_arr[0]
            };

            const text_message = u.js(message);
            const route = (packet_arr.length > 1) ? packet_arr[1].toString() : null;

            u.trace(output => {
                output("publish", connId, "me=" + method, 
                    "ex=" + exchange, "ro=" + route, text_message, u.js(option)) 
            });

            channel.publish(exchange, route, Buffer.from(text_message), option);
        }
        return true;
    } else {
        u.error(conn_name, connId, "publish no channel");
    }
    return false;
}

}
