USE erpdb;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migracion de linktolaunch: de puertos por CU a puertos por modulo.
-- Base host configurable para entorno.
SET @base_host = 'http://167.99.173.100';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4000/CU1-001')
WHERE codigo_usecase = 'CU001';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4000/CU1-002')
WHERE codigo_usecase = 'CU002';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4000/CU1-003')
WHERE codigo_usecase = 'CU003';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4000/CU1-004')
WHERE codigo_usecase = 'CU004';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4000/CU1-005')
WHERE codigo_usecase = 'CU005';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4000/CU1-006')
WHERE codigo_usecase = 'CU006';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4000/CU1-007')
WHERE codigo_usecase = 'CU007';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4000/CU1-008')
WHERE codigo_usecase = 'CU008';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4001/CU2-001')
WHERE codigo_usecase = 'CU2001';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4001/CU2-002')
WHERE codigo_usecase = 'CU2002';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4001/CU2-003')
WHERE codigo_usecase = 'CU2003';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4001/CU2-004')
WHERE codigo_usecase = 'CU2004';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4001/CU2-006')
WHERE codigo_usecase = 'CU2006';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4002/CU3-001')
WHERE codigo_usecase = 'CU3001';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4002/CU3-002')
WHERE codigo_usecase = 'CU3002';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4002/CU3-003')
WHERE codigo_usecase = 'CU3003';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4003/CU4-001')
WHERE codigo_usecase = 'CU4001';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4003/CU4-002')
WHERE codigo_usecase = 'CU4002';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4003/CU4-003')
WHERE codigo_usecase = 'CU4003';

UPDATE usecases
SET linktolaunch = CONCAT(@base_host, ':4003/CU4-004')
WHERE codigo_usecase = 'CU4004';

SELECT codigo_usecase, linktolaunch
FROM usecases
WHERE codigo_usecase IN (
  'CU001','CU002','CU003','CU004','CU005','CU006','CU007','CU008',
  'CU2001','CU2002','CU2003','CU2004','CU2006',
  'CU3001','CU3002','CU3003',
  'CU4001','CU4002','CU4003','CU4004'
)
ORDER BY codigo_usecase;
