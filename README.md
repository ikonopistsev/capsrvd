# capsrvd
capsrvd is a server receiving messages from captor (mysql udf module)

Proxy Service that receives data from mysql plugin Captor and send them to RabbitMQ.

The idea of the capsrvd was to be part of system that provide a solution to the following issue 
We needed to send to Rabbitmq everything that we get inserted into out database


You can use it the next way

!!! Its very important to have captor plugin installed in mysql to make this service work
Check here https://github.com/ikonopistsev/captor

Make a trigger in your mysql database that on each insert row in database it will send 
via captor plugin the data that you insert in database to capsrvd service. The capsrvd 
will accept the data that it received from mysql and immediately sends them to RabbitMQ    
on exchange that you set in config file. 

If you have out of sockets with wait_timeout add

net.ipv4.tcp_tw_reuse = 1 
net.ipv4.tcp_tw_recycle = 1

to sysctl.conf 
