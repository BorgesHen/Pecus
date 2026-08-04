-- Fecha o acesso público às tabelas (alerta "rls_disabled_in_public" do Supabase).
--
-- O QUE ESTAVA ABERTO
-- Todo projeto Supabase publica uma API REST em <projeto>.supabase.co/rest/v1,
-- que consulta o banco com o papel `anon` usando a chave "anon" — chave feita
-- pra ir dentro de navegador, ou seja, pública por natureza. Nas 27 tabelas
-- deste banco o papel `anon` tinha SELECT, INSERT, UPDATE, DELETE e TRUNCATE, e
-- nenhuma tinha Row-Level Security. Somando as duas coisas, quem tivesse a
-- chave anon leria e escreveria tudo — inclusive a tabela Usuario, que guarda
-- e-mail e hash de senha — sem passar pelo login do app.
--
-- POR QUE ISSO NÃO AFETA O APP
-- O app não usa nada do Supabase além do Postgres: fala direto pelo Prisma,
-- autentica com JWT próprio e não tem cliente Supabase nem chave anon em lugar
-- nenhum. Ele conecta como `postgres`, que é DONO de todas as tabelas (dono
-- ignora RLS por padrão no Postgres) e ainda tem o atributo BYPASSRLS. São dois
-- motivos independentes pra ligar RLS não mudar nada pro app.
--
-- Nada de FORCE ROW LEVEL SECURITY aqui: forçar sujeitaria o próprio dono às
-- políticas e, sem nenhuma política, o app pararia de ler tudo.

-- 1. RLS em todas as tabelas de public. Sem política nenhuma de propósito:
--    RLS ligado e zero políticas = ninguém que dependa de política entra, que é
--    exatamente o desejado num banco que não é acessado pela API REST.
--    Em laço pra cobrir as 27 de hoje e ser idempotente.
DO $$
DECLARE tabela record;
BEGIN
  FOR tabela IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabela.relname);
  END LOOP;
END $$;

-- 2 a 4. Tira o que os papéis públicos do Supabase tinham.
--
-- Roda dentro de um IF EXISTS por papel porque `anon` e `authenticated` só
-- existem em banco Supabase: num Postgres comum (o do desenvolvimento local,
-- ver .env.example) um REVOKE direto falharia com 'role "anon" does not exist'
-- e derrubaria a migration inteira.
DO $$
DECLARE papel text;
BEGIN
  FOR papel IN SELECT p FROM unnest(ARRAY['anon', 'authenticated']) AS p LOOP
    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = papel);

    -- (2) Permissões nas tabelas de hoje. RLS já bastaria pra barrar; isto é a
    --     segunda tranca, pra que um descuido futuro (uma política larga, um RLS
    --     desligado sem querer) não volte a abrir tudo.
    --     `service_role` fica como está: a chave dele é de servidor, nunca vai
    --     pro navegador — e o app não a usa.
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', papel);
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', papel);
    EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', papel);

    -- (3) A causa de fundo: as permissões padrão do schema concediam tudo a
    --     esses papéis em CADA TABELA NOVA. Sem mexer aqui, a próxima migration
    --     reabriria o acesso sozinha.
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', papel);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', papel);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', papel);

    -- (4) Terceira tranca — e vale saber o que ela NÃO faz: esses papéis não
    --     têm GRANT direto de USAGE no schema, eles herdam do pseudo-papel
    --     PUBLIC (aparece como "=U/pg_database_owner" no ACL de pg_namespace).
    --     Então este REVOKE não muda nada hoje; fica como guarda caso alguém
    --     conceda USAGE direto a eles mais tarde.
    --
    --     Tirar o USAGE de verdade exigiria REVOKE ... FROM PUBLIC, que atinge
    --     todo papel do banco (inclusive internos do Supabase) e não foi feito
    --     de propósito: sem permissão nenhuma nas tabelas, USAGE no schema não
    --     abre nada — só permite enxergar que os objetos existem. Verificado
    --     assumindo o papel anon: toda leitura e escrita responde
    --     'permission denied for table ...'.
    EXECUTE format('REVOKE USAGE ON SCHEMA public FROM %I', papel);
  END LOOP;
END $$;

-- Se algum dia o app for usar a API do Supabase (supabase-js, Realtime, Storage
-- sobre estas tabelas), os GRANTs precisam voltar — junto de políticas de RLS
-- escritas de propósito, nunca no lugar delas.
