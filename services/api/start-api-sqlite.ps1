# Start API using SQLite persistence (local dev)
$env:USE_INMEM_WALLET='0'
$env:USE_SQLITE='1'
$env:USE_SQLITE_INMEM='0'
$env:PORT='4310'
$env:NODE_ENV='development'
$env:LOG_LEVEL='info'
$env:DATABASE_URL=''
$env:ADMIN_SECRET='dev-admin-secret'
node index.js
