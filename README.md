# capsrvd
capsrvd for rabbitmq

Proxy Service that receives data from mysql plugin captor and send them to RabbitMQ.

The idea of the capsrvd was a part of system that provide a solution to the following issue 
We need to send to Rabbitmq everything that we get inserted into out database


You can use it the next way

####!!! Its very important to have captor plugin installed in mysql to make this service work
Check here https://github.com/ikonopistsev/captor

Make a trigger in your mysql database that on each insert row in database it will send 
via captor plugin the data that you insert in database to capsrvd service. The capsrvd 
will accept the data that it received from mysql and immediately sends them to RabbitMQ    
on exchange that you set in config file. 