alter table public.connected_accounts add column if not exists protected_official_account_id uuid references public.connected_accounts(id) on delete set null;
create index if not exists connected_accounts_protected_official_idx on public.connected_accounts(protected_official_account_id) where protected_official_account_id is not null;

create or replace function public.validate_connected_account_protection() returns trigger language plpgsql set search_path='' as $$
declare target public.connected_accounts%rowtype;
begin
 if new.account_type='official' then new.protected_official_account_id:=null;return new;end if;
 if new.protected_official_account_id is null then return new;end if;
 if new.protected_official_account_id=new.id then raise exception 'account cannot protect itself' using errcode='23514';end if;
 select a.* into target from public.connected_accounts a where a.id=new.protected_official_account_id;
 if not found or target.account_type<>'official' or target.creator_id<>new.creator_id or target.platform<>new.platform then raise exception 'protected official account must be an owned official account for the same provider' using errcode='23514';end if;
 return new;
end$$;
drop trigger if exists validate_connected_account_protection on public.connected_accounts;
create trigger validate_connected_account_protection before insert or update of account_type,creator_id,platform,protected_official_account_id on public.connected_accounts for each row execute function public.validate_connected_account_protection();

alter table public.youtube_oauth_pending_selections add column if not exists protected_official_account_id uuid references public.connected_accounts(id) on delete set null;
