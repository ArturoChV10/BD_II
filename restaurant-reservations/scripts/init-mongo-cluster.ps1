Write-Host "Esperando que los contenedores estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "Inicializando Config Server replica set..." -ForegroundColor Green
docker exec -t restaurant-reservations-cfg1-1 mongosh --eval "rs.initiate({_id:'cfgrs', configsvr:true, members:[{_id:0,host:'cfg1:27017'},{_id:1,host:'cfg2:27017'},{_id:2,host:'cfg3:27017'}]})"

Start-Sleep -Seconds 5

Write-Host "Inicializando Shard 1 replica set..." -ForegroundColor Green
docker exec -t restaurant-reservations-shard1a-1 mongosh --eval "rs.initiate({_id:'shard1rs', members:[{_id:0,host:'shard1a:27017'},{_id:1,host:'shard1b:27017'},{_id:2,host:'shard1c:27017'}]})"

Start-Sleep -Seconds 10

Write-Host "Agregando shard desde mongos..." -ForegroundColor Green
docker exec -t restaurant-reservations-mongos-1 mongosh --eval "sh.addShard('shard1rs/shard1a:27017,shard1b:27017,shard1c:27017')"

Start-Sleep -Seconds 5

Write-Host "Activando sharding para la base de datos..." -ForegroundColor Green
docker exec -t restaurant-reservations-mongos-1 mongosh --eval "sh.enableSharding('restaurant_db')"

Write-Host "Configurando sharding para dishes (clave: restaurant_id hashed)..." -ForegroundColor Green
docker exec -t restaurant-reservations-mongos-1 mongosh --eval "sh.shardCollection('restaurant_db.dishes', { restaurant_id: 'hashed' })"

Write-Host "Configurando sharding para reservations (clave: restaurant_id hashed)..." -ForegroundColor Green
docker exec -t restaurant-reservations-mongos-1 mongosh --eval "sh.shardCollection('restaurant_db.reservations', { restaurant_id: 'hashed' })"

Write-Host "Clúster MongoDB inicializado correctamente" -ForegroundColor Green