# SoporteRemoto
Me canse de pagar / Soporte Remoto

Simple Remote Support Solution

Support Agent -> Customer

It uses a "server" to create a P2P session between they both.

Regarding the "server" I use a linux one to provide a P2P connection beteen Support agent and customer, services installed: cotrun

More info here: https://github.com/coturn/coturn

 /etc/coturn/turnserver.conf

listening-port=3478
listening-ip=you-server-ip
external-ip=you-server-ip
min-port=49152
max-port=49200
fingerprint
lt-cred-mech
userdb=/var/lib/coturn/turndb
realm=soporteremoto.mierp.u
log-file=/var/log/coturn/turnserver.log
simple-log
no-cli

