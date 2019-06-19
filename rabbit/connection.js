const amqp = require("amqplib");
const u = require("../unit");

const delay_step = 1000;
const max_delay = 10000;
const packet_end = Buffer.from("}");
const packet_method = Buffer.from("{\"method\":\"");
const packet_payload = Buffer.from("\",\"payload\":");

module.exports = class connection {

// документация отсюда
// http://www.squaremobius.net/amqp.node/channel_api.html

constructor(conn_name, conf) {
    const url = conf.url;
    if (!url) {
        throw { code: 100500, error: "empty url"};
    }

    this.conn_name = "@" + conn_name;   
    this.url = url;
    this.delay = 0;
    this.message_id = 0;
    this.timestamp = null;
    this.server = null;
    this.prev_time = null;
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

                    // создаем уникальную очередь
                    // return ch.assertQueue(null, { exclusive: true, durable: false })
                    //     .then(res => {
                    //         const { queue } = res;
                    //         u.log(conn_name, "queue", queue);

                    //         // обработчик на прием данных
                    //         return ch.consume(queue, (msg) => {
                    //                 // пененаправляем в объект
                    //                 this.consume(msg, ch) 
                    //                 // подтверждения выставялем автоматически
                    //             }, { noAck: true, exclusive: true });
                    //     });

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
    res.messageId = (++this.message_id).toString();
    res.contentType = "application/json";
    return res;
}

check_timestamp(curr) {
    const { prev_time } = this;
    if (prev_time) {
        if (curr < prev_time) {
            u.error("packet timestamp", prev_time, curr);
        }
    }

    this.prev_time = curr;
}


publish(packet) {
    const { conn_name, channel } = this;
    if (channel && packet.ready) {
        // формируем параметры
        const option = this.pub_opt(packet);
        const { data_arr, cmd, param, timestamp } = packet;

        // проверяем последовательность таймстампов
        this.check_timestamp(timestamp);

        for (const packet_arr of data_arr) {
            // первая строчка данные
            // создаем буффер отправки
            const message = Buffer.concat([packet_method, Buffer.from(cmd), 
                packet_payload, packet_arr[0], packet_end]);

            // следующие - маршруты
            let i = 1;
            const count = packet_arr.length;
            if (i < count) {
                do {
                    const route = packet_arr[i];
                    u.log("publish", message.asString());
                    channel.publish(param, param + route, message, option);

                } while (++i < count);
            } else {
                // отправляем маршрутом по умолчанию
                u.log("publish", message.asString());
                channel.publish(param, param, message, option);
            }
        }

        return true;
    } else {
        u.error(conn_name, "publish no channel");
    }
    return false;
}

}