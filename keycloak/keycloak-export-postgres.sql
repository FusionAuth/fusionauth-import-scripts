select FIRST_NAME AS "FIRST_NAME", LAST_NAME AS "LAST_NAME", EMAIL AS "EMAIL", 
USERNAME AS "USERNAME", EMAIL_VERIFIED AS "EMAIL_VERIFIED", U.ID AS "ID",
C.SECRET_DATA::jsonb ->> 'value' as "PASSWORD",
C.SECRET_DATA::jsonb ->> 'salt' as "SALT",
C.CREDENTIAL_DATA::jsonb ->> 'hashIterations' as "HASHITERATIONS",
C.CREDENTIAL_DATA::jsonb ->> 'algorithm' as "ALGORITHM",
CREATED_TIMESTAMP AS "CREATED_TIMESTAMP", REALM_ID AS "REALM_ID"
from USER_ENTITY U, CREDENTIAL C
where U.ID = C.USER_ID AND U.REALM_ID = 'RealmID'
