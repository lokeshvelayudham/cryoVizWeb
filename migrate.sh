#!/bin/bash

# URI with URL-encoded password (Primary Master Key - Write Access)
URI="mongodb://cryovizweb-db:DrIyEOSQ3yGjrXK4tKeCeBpPtO6sPq6OdviGZXYuAOp9bnGnMWMxZx51gkVm2IGeS3vRzFwZrxD4ACDbpzbhgA%3D%3D@cryovizweb-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@cryovizweb-db@"

echo "Restoring to Cosmos DB..."
# Restore specific database CryoVizWeb
mongorestore --uri="$URI" --nsInclude="CryoVizWeb.*" --dir=./mongo-dump --numParallelCollections=1 --numInsertionWorkersPerCollection=1 --batchSize=5
