--esta es la logica de la transaccion funcional creo, falta ponerlo al index.ts
begin;
	with ld as(
		insert into "lead" (name, institution, "contactPhone", phone)
		values ('jose', 'UMSNH', '+520123456789', '+51012345689')
		returning id
	),
	ld2 as (
		insert into "leadPassword" ("idLead", password ) 
		select id, 'password' from ld returning "idLead"
	)
	insert into "codeLead" ("idLead", code)
	select "idLead", '12345678' from ld2;
commit;
