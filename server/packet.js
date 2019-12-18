const u = require("../unit");
const connection = require("./connection.js");

module.exports = class packet {

constructor(timestamp, connId) { 
    this.timestamp = timestamp;
    this.connId = connId;

    this.method = null;
    this.exchange = null;
    // пакет еще не готов
    this.ready = false;
    this.error = false;
    // данные пакета
    this.data_arr = [];
}

receive(data_buf) {

    const data = JSON.parse(data_buf);
    if (data.length < 4) {
        throw { code: 100500, error: "bad packet" };
    }

    this.method = data[1];
    this.exchange = data[2];
    const data_arr = data.slice(3);
    this.data_arr = data_arr;
    const { length } = data_arr;
    const { timestamp, method, exchange, connId } = this;

    u.log(connId, "size=" + length, u.js(data));
    this.ready = true;
}

set_error(val) {
    this.error = val;
    if (val) {
        this.ready = false;
    }
}

}