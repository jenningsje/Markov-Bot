cp ../../fetch-get/fetch_get.js ../src/fetch_get.js
cp ../../logo.png logo.png
cp ../../logo.png ./src/app/components/logo.png
docker build -t freedomgpt/freedomgpt .
docker run -d -p 8889:8889 freedomgpt/freedomgpt
rm ../src/fetch_pdbs.js
rm logo.png 
rm ./src/app/components/logo.png
