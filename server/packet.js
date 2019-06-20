const u = require("../unit");
const connection = require("./connection.js");

module.exports = class packet {

constructor(param_arr, conn_id) { 
    this.timestamp = param_arr[0];
    this.cmd = param_arr[1];
    this.param = param_arr[2];
    // пакет еще не готов
    this.ready = false;
    this.error = false;
    // данные пакета
    this.data_arr = [];
    // флаг приема полного json'a
    this.advanced_msg = false;
    this.conn_id = conn_id;
}

push_back(data_buf) {
    const { data_arr } = this;
    data_arr.push(data_buf);
}

set_ready(val) {
    this.ready = val;
    const { cmd, param, data_arr, conn_id } = this;
    const { length } = data_arr;
    u.log(conn_id, "packet", cmd, param, "size=" + length, data_arr.toString());
}

set_error(val) {
    this.error = val;
    if (val) {
        this.ready = false;
    }
}

toString() {
    const { timestamp, cmd, param } = this;
    return timestamp + ' ' + cmd + ' ' + param;
}

}