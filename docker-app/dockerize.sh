cp ../../fetch-pdbs/fetch_pdbs.js ../src/fetch_pdbs.js
docker build -t freedomgpt/freedomgpt .
docker run -d -p 8889:8889 freedomgpt/freedomgpt
rm ../src/fetch_pdbs.js
