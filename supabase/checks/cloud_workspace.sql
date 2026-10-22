-- Must show both functions. NULL means the cloud migration did not apply here.
select to_regprocedure('public.viflow_load_workspace()') as load_workspace,
       to_regprocedure('public.viflow_save_workspace(jsonb,uuid)') as save_workspace;

-- If both functions exist but the API returns PGRST202, refresh its schema cache.
notify pgrst, 'reload schema';

-- All should be false: authenticated clients write only through the RPCs.
select has_any_column_privilege('authenticated','public.boards','insert') as direct_board_insert,
       has_any_column_privilege('authenticated','public.cards','update') as direct_card_update,
       has_table_privilege('authenticated','public.cards','delete') as direct_card_delete;
