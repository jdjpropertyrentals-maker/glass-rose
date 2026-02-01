# Start API with in-memory wallet (run this from PowerShell)
$env:USE_INMEM_WALLET='1'
$env:PORT='4310'
$env:NODE_ENV='development'
$env:LOG_LEVEL='info'
$env:DATABASE_URL=''
$env:ADMIN_SECRET='dev-admin-secret'
node index.js

