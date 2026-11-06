# Referensi pengujian sebelum milestone arus kas

Berkas pada folder ini adalah snapshot pengujian lama yang mengasumsikan akses anonim dan lima/delapan tabel. Bukan suite aktif. Suite pengganti di tests/cashflow.test.js menggunakan HTTP dan MySQL/MariaDB nyata untuk migrasi, auth, ownership seluruh resource, CRUD, ORM/raw, agregasi dan sesi. tests/unit.test.js menguji validasi, password, query plan dan integrasi upstream terisolasi.
